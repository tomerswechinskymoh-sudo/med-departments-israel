import { RoleKey, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const deletionLedgerSchema = z.array(z.object({
  userId: z.string().min(1),
  status: z.enum(['VERIFIED', 'REJECTED']),
  deletedAt: z.string().datetime()
}).strict());
export type DeletionLedgerEntry = z.infer<typeof deletionLedgerSchema>[number];

// Run offline BEFORE reopening a restored database. Never infer a decision from
// the restored snapshot alone; use the minimal ledger captured before restore.
export async function replaySignupDeletion(entry: DeletionLedgerEntry, execute = false) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${entry.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: entry.userId } });
    if (!user) return 'missing' as const;
    const cutoff = new Date(entry.deletedAt);
    // A subsequent registration or decision must never be overwritten.
    if (user.createdAt > cutoff || (user.verificationSubmittedAt && user.verificationSubmittedAt > cutoff) ||
        (user.verifiedAt && user.verifiedAt > cutoff)) return 'newer' as const;
    const ambiguous = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM "UploadedFile" f WHERE f.uploaded_by_user_id = ${user.id}
      AND f.category = 'USER_VERIFICATION_PROOF'
      AND (NOT signup_document_is_exclusive(f, ${user.id}) OR f.created_at > ${cutoff})`;
    if (ambiguous[0].count > BigInt(0)) return 'reviewRequired' as const;
    if (user.verificationProofUrl) {
      const pointer = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM "UploadedFile" f WHERE '/api/files/' || f.id = ${user.verificationProofUrl}
        AND signup_document_is_exclusive(f, ${user.id})`;
      if (pointer[0].count !== BigInt(1)) return 'reviewRequired' as const;
    }
    if (!execute) return 'eligible' as const;
    await tx.user.update({ where: { id: user.id }, data: {
      verificationStatus: entry.status as VerificationStatus,
      roleKey: entry.status === 'VERIFIED' && ['resident', 'specialist'].includes(user.roleStatus ?? '') ? RoleKey.RESIDENT : user.roleKey,
      verifiedAt: user.verifiedAt ?? cutoff
    }}); // The existing trigger deletes atomically and refuses ambiguous files.
    await tx.signupDocumentDeletion.update({ where: { userId: user.id }, data: { deletedAt: cutoff } });
    return 'reconciled' as const;
  });
}
