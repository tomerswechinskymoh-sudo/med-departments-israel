# Phase 3C operations — guarded release

## Approved design, not institutional authorization

Internal configuration: Rabin Medical Center / Beilinson, Anesthesiology, Israeli medical-faculty student route, at most five explicitly allowed accounts and one offering at a time. Hospital participation, chief/delegate identities, participant accounts, dates, quotas and institution/faculty rules remain unconfirmed. No seats, accounts, representative appointments or registry rows are created by this release.

External document verification is the approved product design. The institution must accept its process before use. Hitmachut must retain only requirement category, decision, authorized verifier, decision time, applicable validity and minimal audit reference; no raw files/IDs. No platform scanning claim. The deployed baseline does not yet implement the Phase 3B assessment/allocation integration or this external-verification record workflow. Do not use older identity uploads instead. Groups, uploads, payments and external notifications stay disabled for the first pilot.

## Operator paths and stop control

- `/placements`: public three-route overview; no application form or available seats.
- `/admin/placements`: authenticated platform-admin design/readiness view. Chief/delegate slots are empty, not database accounts. Appointment is visibly blocked. This is not a commissioned coordinator dashboard.
- `src/lib/placements/pilot-release.ts`: admission hard-disabled, empty accounts/offerings. An environment flag cannot activate it accidentally.
- `src/lib/placements/request-guard.ts`: middleware AND individual legacy route handlers block new submissions, confirmations, offerings/quotas, imports, invitations, document intake, payment actions and representative grants. Existing department login/logout, applicant cancellation requests and authorized cancellation decisions remain under authentication/origin/resource checks. Hospital mutation access now requires a verified, email-verified REPRESENTATIVE grant, not VIEW_ONLY. Cancellation request/decision transactions lock the application row, deduplicate requests and prevent repeated decisions; grants are rechecked inside the decision transaction. No historical placement is deleted or cancelled by the switch. The existing cleanup endpoint is outside this gate.
- Review GET paths remain under their existing authorization. Unsafe legacy mutations are not restored. Full Phase 3B shared-allocation bridge is still local-only and must be reconciled before allowing new writes.

The deployed gate already is the kill switch. Future enablement must preserve review/cancellation and necessary cleanup while disabling submissions/invitations/confirmation/uploads. Do not remove this gate just to expose a form.

## Local guarded-release validation

Use the release worktree `/Users/tomerswechinsky/Documents/CODEX/hitmachut-phase3c-release`. It belongs to the same Git repository; the original dirty checkout is preserved. Its private dependency copy avoids changing the Prisma client used by the Phase 3B runtime.

The verified disposable Docker container is `hitmachut-phase3a-local`, PostgreSQL 16, loopback binding `127.0.0.1:55439`, anonymous volume, separate database `phase3c_guarded_test_only`. A full schema derived from the deployed baseline was applied only to this empty database. Test accounts are `phase3c-admin@example.test` and `phase3c-student@example.test`, password `Synthetic-Phase3C-Only!`; they do not exist in production.

```sh
# From the release worktree, with the existing disposable database running:
node scripts/placements/phase3c/local-run.mjs node --import tsx scripts/placements/phase3c/seed-local.ts
node scripts/placements/phase3c/local-run.mjs node_modules/typescript/bin/tsc --noEmit
node scripts/placements/phase3c/local-run.mjs node_modules/next/dist/bin/next build
node scripts/placements/phase3c/local-run.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3105
# In another terminal:
node scripts/placements/phase3c/local-run.mjs node scripts/placements/phase3c/browser-local.mjs
node scripts/placements/phase3c/local-run.mjs node --import tsx scripts/placements/phase3c/verify-guards.ts
node scripts/placements/phase3c/local-run.mjs node scripts/placements/phase3c/verify-cancellation.mjs
# Stop only the verified worktree server; keep the disposable DB for inspection:
node scripts/placements/phase3c/stop.mjs
```

URL: `http://localhost:3105/placements`. The wrapper supplies only loopback DB, private synthetic session key and local app URL; no mail, storage, payment or scraping credentials. Existing Phase 3B full workflow remains at `http://localhost:3104/placements`; its original repeatability instructions and caveats remain in `phase3b-report.md` in the original checkout. Do not run its fresh-only fixtures against the populated demo.

## Hosted prerequisites and migrations

Actual project: `project-2i9uv`, ID `prj_0YCcPYlSvFYIveAzKWI1wDO6PNaE`, GitHub `tomerswechinskymoh-sudo/med-departments-israel`, production branch `main`; main is not branch-protected. Both custom domains point to this project. The separate clinical-rotations demo project is not used.

Preview has no project-level DATABASE_URL. DIRECT_URL, AUTH_SECRET, Resend and other keys have shared preview/production scopes. This is not a verified isolated preview configuration. A protected schema-free preview can verify release visibility/guards, but not database workflows. Before commissioning: assign a separately authorized nonproduction database/role, confirm host/branch identity and no production data, remove inherited provider destinations for tests, apply reconciled schema, synthetic fixtures only, then run authenticated/concurrency/privacy suites. No hosted database/provider account was created here.

Vercel lists production HMAC/auth/cleanup secret keys, but readback omitted their values. Presence is not runtime validity; no key was provisioned, exposed, rotated or copied from local tests. The repository-recorded Neon connection permitted a READ ONLY metadata transaction: 39 migration history rows, no Phase 3A/B placement columns/tables. That local connection cannot by itself prove equality to Vercel's unreadable effective URL. Metadata receipt is private. Backup/PITR/restore readiness is NOT_VERIFIED.

No production migration is authorized by the incomplete checks. The deployed baseline and local 3B schema differ in status enums, identity/group/cancellation models and services. Reconcile additively; inspect the entire chain and drift before `npm run prisma:migrate:deploy`. That command applies every pending migration. Never deploy the local full-schema test baseline. The original dirty tree also contains an unrelated staz migration. No history edits/reset/db-push/demo seed against production.

Reference: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production

## Cleanup and rollback

Existing configured production cron: `/api/internal/clinical-rotations/cleanup`, `0 2 * * *`. Preserve it; no new schedule is needed for a file-free pilot. Existing handler accepts its clinical cleanup secret; Vercel sends CRON_SECRET as Bearer. Equality of the configured values is NOT_VERIFIED; no successful scheduled run was observed or claimed. Local tests verify rejection of missing/wrong authorization and successful synthetic empty-DB cleanup only. No production cleanup was manually invoked.

Vercel does not automatically retry failed cron invocations; future commissioning must explicitly verify authorization compatibility, bounded retry/idempotency, actual deletion and an observed scheduled run. Reference: https://vercel.com/docs/cron-jobs/manage-cron-jobs

Previous production deployment: `dpl_HgZGELjUySopSSgUixZJL5CWc1DD`, URL `https://project-2i9uv-rgotrww32-tomerswechinskymoh-sudos-projects.vercel.app`, commit `4f2ae9e487cf441ccce2407de0531e68a8abf833`. Application rollback to that deployment would also REMOVE the new write guards. Prefer a forward fix preserving guards; if rollback is essential, evaluate old write exposure first. No database or schedule changes need reversal in this release. Application rollback never restores/reverses schema or discards intervening production activity.

## Activation checklist

1. Written institutional participation/workflow/external-verification/retention confirmation.
2. Reconciled shared services and additive schema, tested restore and old/new compatibility; isolated hosted preview.
3. Implement/verify external evidence metadata and current confirmation gates; no upload substitute.
4. Admin verifies and appoints actual chief/delegate; no self-grants. Purpose-specific authority remains separate.
5. Allowlist exact institution/department/route/offering and at most five genuine accounts; representative enters dates/capacity/requirements.
6. Test per-resource authorization, revocation, current evidence, approvals, capacity/overlap races, legacy bridge and cancellation in preview.
7. Enable only approved individual Israeli-faculty scope after production safety checks; observe genuine participation without fabricating smoke-test bookings.
