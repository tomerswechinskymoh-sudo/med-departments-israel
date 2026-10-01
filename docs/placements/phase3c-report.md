# Phase 3C — guarded release, pilot not enabled

Checkpoint A completed: verified production baseline, isolated release worktree, internally approved design recorded and guarded code locally tested. Deployment receipts and final allowance will be added after preview/live verification.

This is a bounded guarded-release subset, not completion of the real placement system's operational commissioning. The original Phase 3B source/tests remain preserved in the original dirty checkout and its isolated runtime. The actual production branch was newer than that local baseline: commit `4f2ae9e` already included branding, a public overview, additional legacy identity/import/cancellation code and a configured cleanup job. The local Phase 3B report is accurate for its inspected checkout, not a complete account of the newer deployed branch.

| Capability | This release / actual verification | Remaining gate |
|---|---|---|
| Branding, directory, login | Preserved deployed baseline; no unrelated dirty files included | Live smoke verification |
| Public entry | Three learner-route cards, accurate closed-registration wording, no real/synthetic offers | Institution-authorized availability |
| Pilot scope | Internal Rabin/Beilinson Anesthesiology, Israeli-faculty only, max 5 accounts/1 offering; empty slots/lists | Hospital confirmation, verified chief/delegate, genuine allowlist/dates/capacity |
| Admission/legacy writes | Dual middleware/handler guard; 34 mutation handlers inventoried; 30 authenticated/anonymous HTTP denials tested | Reconcile legacy/new shared services before enabling |
| Operator UI | Authenticated admin readiness/design view with clearly blocked representative slots | Full chief appointment, live offering/evidence/approval/deletion queues NOT commissioned |
| External document verification | Approved design recorded; uploads blocked | Metadata persistence/UI/confirmation integration with institution-approved process remains incomplete |
| Eligibility, HMAC/import, documents | Existing local 3B source retained; new production intake/import blocked | Schema compatibility; production key validity not verified; no real import needed for default Israeli route |
| Groups/payments/notifications | Pilot actions blocked, no provisioning or sends | Out of scope for first pilot |
| Capacity/cancellation | No allocation logic replaced; new confirmations blocked; inherited authenticated cancellation paths retained | Full deployed-baseline shared transaction/legacy reconciliation and race retest |
| Database/migration/backup | Read-only schema metadata only; separate real local PostgreSQL for release tests | No 3A/3B live tables; effective hosted URL equivalence and restore capability NOT_VERIFIED; no production migrations |
| Preview | Existing protection verified, isolated hosted database absent | Functional hosted preview NOT_VERIFIED |
| Cleanup | Existing schedule preserved, local authorization verifier passed | Secret compatibility/scheduled-run receipt not verified; no new jobs or live cleanup |

Local checks: TypeScript and production build passed using sanitized loopback-only settings. Guard inventory passed. Seven relevant existing verifier programs plus marketplace and cleanup-handler verifiers passed. Real local authenticated browsers tested admin/applicant/anonymous boundaries, RTL desktop/mobile without overflow, 30 denied mutation requests including middleware-bypass-style headers, cancellation authentication and fail-closed cleanup. Zero external browser requests. Screenshots inspected. Initial seed lacked Role lookup rows (P2003); corrected synthetic seed passed. First sandboxed cleanup test could not connect to localhost; rerun with local network permission passed.

The 24 Phase 3B real database/privacy/race groups and earlier browser journeys are prior evidence, not newly rerun or proof of hosted integration. No new concurrency claim is made by guard tests. The release does not claim full operator UI, external-verification workflow or pilot activation complete.

Artifacts: `/private/tmp/hitmachut-phase3c/` (logs, local screenshots, private metadata receipts, isolated dependency copy). Source/release worktree: `/Users/tomerswechinsky/Documents/CODEX/hitmachut-phase3c-release`, same Git repository, branch `phase3c-guarded-release` from actual production. Original checkout/uncommitted work retained. No global model setting changes, no subagents. Requested Astra/High; runtime identity/effort not independently attestable. Starting weekly allowance 26% remaining (74% used); checkpoint reading 24% remaining (76% used), rounded account-wide.

See `phase3c-operations.md` for exact commands, deployment rollback reference, preview requirements, preserved schedule, safeguards and activation checklist.
