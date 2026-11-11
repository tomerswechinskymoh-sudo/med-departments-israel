import { Prisma, RoleKey, VerificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// The database trigger deletes every exclusive signup proof in this same transaction.
// No decision can commit if deletion or provenance validation fails.
export async function decideRegistration(input: { userId: string; actorId: string; approved: boolean; note?: string | null }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    const status = input.approved ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    await tx.user.update({ where: { id: input.userId }, data: {
      verificationStatus: status,
      roleKey: input.approved && ['resident', 'specialist'].includes(user.roleStatus ?? '') ? RoleKey.RESIDENT : user.roleKey,
      verificationRejectionReason: input.approved ? null : input.note ?? null,
      verifiedByAdminId: input.actorId,
      verifiedAt: new Date()
    }});
    await tx.auditLog.create({ data: { actorUserId: input.actorId,
      action: input.approved ? 'user.verification_approved' : 'user.verification_rejected',
      entityType: 'User', entityId: user.id,
      metadata: { status, signupDocumentsDeleted: true } as Prisma.InputJsonValue
    }});
    return user;
  });
}
