import { prisma } from '../src/lib/prisma';

// Explicit bounded batch. No content, filenames, IDs or personal data in output.
const execute = process.argv.includes('--execute');
const batchSize = Number(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] ?? 50);
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('batch-size must be 1..500');
if (execute && !process.argv.includes('--confirm-reviewed-dry-run')) throw new Error('Run and review dry-run first; pass --confirm-reviewed-dry-run to execute');
async function main() {
  const counts = await prisma.$queryRaw<Array<{ status: string; eligible: bigint; ambiguous: bigint }>>`
    SELECT u.verification_status::TEXT AS status,
      count(*) FILTER (WHERE signup_document_is_exclusive(f,u.id)) AS eligible,
      count(*) FILTER (WHERE NOT signup_document_is_exclusive(f,u.id)) AS ambiguous
    FROM "UploadedFile" f JOIN "User" u ON u.id=f.uploaded_by_user_id
    WHERE f.category='USER_VERIFICATION_PROOF' GROUP BY u.verification_status`;
  const unresolved = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) FROM "User" u WHERE u.verification_proof_url IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "UploadedFile" f WHERE '/api/files/' || f.id=u.verification_proof_url AND signup_document_is_exclusive(f,u.id))`;
  const orphanedSignupFiles = await prisma.uploadedFile.count({ where: { category: 'USER_VERIFICATION_PROOF', uploadedByUserId: null } });
  console.log(JSON.stringify({orphanedSignupFiles, mode: execute ? 'execute' : 'dry-run', counts, unresolvedPointers: unresolved[0].count}, (_,v) => typeof v === 'bigint' ? Number(v) : v));
  if (!execute) return;
  const ambiguousUsers = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT u.id FROM "User" u WHERE u.verification_status::TEXT IN ('VERIFIED','REJECTED')
    AND (EXISTS (SELECT 1 FROM "UploadedFile" f WHERE f.uploaded_by_user_id=u.id
      AND f.category='USER_VERIFICATION_PROOF' AND NOT signup_document_is_exclusive(f,u.id))
      OR (u.verification_proof_url IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "UploadedFile" f
        WHERE '/api/files/' || f.id=u.verification_proof_url AND signup_document_is_exclusive(f,u.id))))
    ORDER BY u.id LIMIT ${batchSize}`;
  for (const user of ambiguousUsers) {
    await prisma.auditLog.create({data:{action:'signup.document_cleanup_review_required',entityType:'User',entityId:user.id,metadata:{manualReviewRequired:true}}});
  }
  // Select only exclusive candidates so an ambiguous first batch cannot starve safe cleanup.
  const users = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT u.id FROM "User" u WHERE u.verification_status::TEXT IN ('VERIFIED','REJECTED')
    AND EXISTS (SELECT 1 FROM "UploadedFile" f WHERE signup_document_is_exclusive(f,u.id))
    AND NOT EXISTS (SELECT 1 FROM "UploadedFile" f WHERE f.uploaded_by_user_id=u.id AND f.category='USER_VERIFICATION_PROOF' AND NOT signup_document_is_exclusive(f,u.id))
    AND (u.verification_proof_url IS NULL OR EXISTS (SELECT 1 FROM "UploadedFile" f WHERE '/api/files/' || f.id=u.verification_proof_url AND signup_document_is_exclusive(f,u.id)))
    ORDER BY u.id LIMIT ${batchSize}`;
  let deleted = 0, reviewRequired = 0;
  for (const user of users) {
    try {
      // Function locks and checks status/purpose/references again, then deletes atomically.
      const result = await prisma.$queryRaw<Array<{ n: number }>>`SELECT delete_signup_documents(${user.id}) AS n`;
      deleted += result[0].n;
    } catch {
      reviewRequired++;
      await prisma.auditLog.create({data:{action:'signup.document_cleanup_failed',entityType:'User',entityId:user.id,metadata:{retryRequired:true}}}).catch(() => undefined);
    }
  }
  console.log(JSON.stringify({ processed: users.length, deleted, reviewRequired, deferredAmbiguous: ambiguousUsers.length, batchSize }));
  if (reviewRequired || ambiguousUsers.length) process.exitCode = 2;
}
main().catch(() => { console.error('Cleanup failed; no deletion claim can be made. Check migration and database access.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
