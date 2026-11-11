# Production release preflight — 2026-11-11

This supplements the implementation report dated 2026-11-10. Production promotion is a separate, verified step; this document records the release prerequisites, not a claim that promotion has finished.

## Scope and targets

- Baseline: `fbc2097ad50d2dc7e3285baad95a423c8298030d`, matching remote main and the existing live deployment.
- Vercel project `project-2i9uv` (`prj_0YCcPYlSvFYIveAzKWI1wDO6PNaE`), existing team and GitHub repository. Both `hitmachut.org` and `www.hitmachut.org` currently point at `dpl_4y2ycUNauV3c4Uy3ErXwBzm1kLbE`.
- Neon project `sparkling-wildflower-78804175`, production branch `br-wispy-snow-amf2igxi`, database `neondb`, compute `ep-odd-pine-amqmgo7p`.
- A read-only Vercel production-environment build verified both connection URLs resolve to that compute/database, the connection roles match, the application origin matches the existing domains, and required auth/mail settings exist. No environment secrets were downloaded. The probe did not receive the custom domains.
- Preserve domain aliases, providers, regions, cron schedule, preview protection and existing service configuration. Do not run historical cleanup, seed/import fixtures, send test mail or create production test accounts/reviews.
- Previously untracked documentation for other releases stays outside the commit and deployment archive. The release is uploaded from `git archive` of the reviewed commit.

## Restore point and migration validation

- Manual Neon snapshot `snap-nameless-star-amcmcepf`, created 2026-11-11 10:07:08 UTC from the verified production branch. Read back from the snapshot list with nonzero size (117358592 bytes). Existing six-hour PITR and backup scheduling were not changed.
- Isolated validation branch `br-proud-snow-amwoyk4o`, parent production, creation LSN `0/3C39E968`. The complete new migration ran successfully as one transaction there. Users/files/review submissions/reviews remained 27/28/8/7; deletion and marketing-event tables remained empty. Both source flags are true at revision zero.
- All 40 migrations also passed through `npm run prisma:migrate:deploy` on a fresh, disposable local PostgreSQL database, including the new BEGIN/COMMIT and bounded lock/statement timeouts.
- Production has 39 completed migrations. Only `202611100001_privacy_sources_mail` is pending; no unresolved migration failure was found.
- One existing checksum difference was investigated before proceeding: `202604290001_residency_navigator_profile_fields` was applied from git `1d21601` (SHA-256 `18c8fda9605821ebc8ba284b5d3cdc3fc691ab87ba525b5573eda4b11ecf2d03`). Commit `c84480b` added only `IF NOT EXISTS` clauses (current SHA-256 `cbecd9b59ecbf814de11cf7ab1225c9330e7eace4422dea95efe76e19e19ae27`). The production copy has all 13 expected nullable columns/types and the region index. This exact historical pair is documented in the release guard; no migration history is rewritten. All other historical checksums match.

## Order and rollback

1. Commit only reviewed code, tests and related documentation; build an exact archive.
2. Submit a production-target Vercel deployment with `--skip-domain`. Explicit build-only opt-in enables `scripts/production-release-migration.cjs`; ordinary builds never migrate.
3. The guard rechecks target, restore-point identifier, history/checksums and the sole allowed pending migration, then invokes the existing `npm run prisma:migrate:deploy`. It requires successful completion and both source flags true before continuing the application build. Secrets remain inside Vercel.
4. Wait for READY; inspect sanitized migration/build evidence and smoke the staged artifact. Promote only that verified deployment through the existing project.
5. Smoke the live domains and the existing authenticated admin session. Verify all four source-switch combinations and restore true/true. Never make registration decisions as a production test.
6. Push the exact reviewed commit through the existing repository workflow, preserving the ignore-build protection for commits already deployed through CLI.

The migration is additive; old code remains available while the new build completes. New deletion triggers apply to subsequent registration decisions, without scanning/deleting existing records. If code smoke fails, restore the previous Vercel deployment while retaining additive database changes. Do not reset production, drop tables or blindly restore an older database over newer activity. A database restore would require an offline reconciliation of subsequent writes and the deletion ledger described in the implementation report.

## Verification before release

- Build, lint/type checks and `tsc --noEmit` passed.
- Unit suite: 70 passed, one explicitly skipped external-data case.
- Privacy/source/mail database integration: 12 passed. Release guards: two passed, including wrong targets, unknown migrations, unfinished history, exact historical hash exception and idempotent completion.
- Upload suite: seven unit tests plus 16 scenarios in each of desktop Chromium, mobile Chromium and iPhone WebKit passed, with writes intercepted.
- Accessibility: 45 axe scans within 53 recorded checks, no reported violations or horizontal overflow at tested widths.
- Questionnaire release browser test: desktop/tablet/mobile complete 30-question flow, persistence, editing, ranking, disclosure and department navigation passed. Four outdated selectors were updated to existing headings/text; questionnaire product behavior was unchanged.
- Existing metric explanation and onboarding eligibility checks passed (41 and eight checks respectively).
- Onboarding route regression: 12 passed after extending the in-memory mock for the new consent row lock/event. It still verifies all mandatory/exempt groups and signup without marketing consent. Local HTTP checks passed for approval, document access, legacy denial, late email, unsubscribe, account permissions and login success/failure.

These tests do not constitute a full screen-reader or physical-mobile audit. Full mail delivery is not tested with real users. Missing verified marketing sender details keep marketing fail-closed; service mail configuration remains present. Historical document cleanup remains explicitly unperformed.
