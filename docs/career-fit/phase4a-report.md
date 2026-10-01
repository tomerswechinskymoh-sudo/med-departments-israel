# Hitmachut Phase 4A — exploratory beta

## Scope and implementation

Public routes: `/career-fit` (questionnaire and in-memory results/continuation), `/career-fit/departments` (direct department entry), `/career-fit/methodology` (sources/formulas/limitations). Desktop/mobile navigation: בחירת התמחות. Existing brand, directory, authentication and restricted comparison reused.

28 original Hebrew questions, four short sections, separate dimension priorities, unknown/skip, back/edit/reset, and investigation-only considerations. Sixteen partial specialty profiles; fifteen additional official base specialties explicitly unprofiled. Each profile includes source URLs, version, interpretation, supported/missing dimensions and limitations. Multiple routes preserved for emergency medicine, radiology and rehabilitation; the additional psychiatry route is explained without relabeling it a subspecialty. No subspecialty-only or fellowship profile is offered as unrestricted direct entry.

Pure deterministic matching uses dimension means, explicit weights, coverage gates and evidence bounds. Explanations use the same contribution objects. Overlapping evidence remains unresolved; stable alphabetical display with up to five initial cards and all remaining directions expandable. No success probability or fit percentage. All-unknown/too-few/neutral answers yield summary and exploration guidance. See `methodology.md` (formula and availability rules documented before tests), `source-record.json`, and `src/lib/career-fit/config.ts` (full original questions/profiles/rules).

Eight department controls. Only region, institution preference and institution type can score. Unsupported exposure, research, size, teaching/mentorship and environment remain visible with “אין כרגע מידע מספיק להשוואה לפי העדפה זו”. Read-only catalog endpoint returns only public IDs/names/slugs/specialty/institution/region/type, with existing public visibility restrictions. Raw recorded region is normalized without default-to-center inference. Effective hospital identity must match the original institution before attaching region/type. Data year unavailable and explicitly labeled; retrieval date never masquerades as observation date. Completeness shown per selected specialty. No restricted metrics, raw surveys or external ENT research imported.

Hard filters alone exclude; unknown hard evidence goes to unverified, unknown soft evidence to insufficient-data/unranked. Only full selected-soft coverage is ranked using a fixed denominator. No preferences means filter/facts mode. Ties stay ties. Existing authenticated comparison route receives public department identifiers only.

Privacy: component memory only; no persistence, answer analytics, answer logs/URLs, account changes, runtime AI or answer POST. One answer-independent public catalog GET; existing site auth boundaries preserved. No claims that the entire site is anonymous.

## Isolation and focused changes

Worktree `/Users/tomerswechinsky/Documents/CODEX/hitmachut-phase4a-release`, branch `phase4a-career-fit`, based on production `6539d4f7898c1ccb4be1abb384f662f3ca113081`. Original dirty Phase 3B checkout untouched. Separate synthetic PostgreSQL database `phase4a_career_fit_test_only` in verified loopback container `hitmachut-phase3a-local:55439`; schema only, 12 fake departments/3 specialties and one fake learner. No production applicant/hospital data copied or mutated. No migration, dependency, account-system, job or flag changes.

Two narrow integration edits: navigation link and build-phase check before shared public-option caching. Browser testing found the header had cached the build-only empty catalog fallback; moving the check before the cache prevents runtime empty results. An early adapter attempted lookup by public effective-hospital ID; the corrected adapter joins through already-public department IDs and leaves uncertain identity unknown. Initial authenticated-browser assertion ran before streamed content was ready; corrected to wait for the actual comparison heading/row. Failures and subsequent pass receipts retained locally.

## Validation and release receipts

16 independent scoring tests pass: determinism, unknown vs midpoint, insufficient information, question-count normalization, exact weights/contribution sums, ties, missing coverage, unsupported metrics, multiple pathways and explicit safe dimension allowlists. These are behavioral tests, not scientific validation. TypeScript and production build passed. API returns actual 503/CATALOG_UNAVAILABLE with no database config. Existing 34-handler placement guard inventory passed. Final browser/release receipts appended below.

Artifacts: `/private/tmp/hitmachut-phase4a/logs/`, source snapshots, request metadata (no answers), catalog completeness summaries, and `/private/tmp/hitmachut-phase4a/screenshots/`. Real Chrome desktop 1440×1000 and mobile 390×844. Required final flows: complete questionnaire, keyboard radio, back/edit/reset, unknown and insufficient results, unresolved ties, continuation/direct department entry, sparse and hard-unverified groups, unsupported preferences, catalog failure/retry, anonymous/authenticated comparison, unchanged home/directory/login/placements, request/storage privacy and guarded mutations. Screenshots visually checked for RTL/readability/overflow.

Starting allowance: 22% remaining (78% used). Target 19%, hard boundary 17%; no model changes, subagents or reset credits. Final reading recorded with release receipt. Values are rounded account-wide readings, not precise task attribution.

Rollback: guarded deployment `dpl_CNmFn7SbR3avZfBVEDDMamhrrWXn`, https://project-2i9uv-m0o3u76pq-tomerswechinskymoh-sudos-projects.vercel.app, commit `6539d4f7898c1ccb4be1abb384f662f3ca113081`. Application-only rollback; do not touch the live database. Existing Vercel project `prj_0YCcPYlSvFYIveAzKWI1wDO6PNaE` / `project-2i9uv`, GitHub main verified unprotected, existing www/apex aliases retained. No DNS changes.

Placements remain **DEPLOYED_GUARDED — PILOT_NOT_ENABLED**. Admissions, documents/uploads, offerings and representative enablement are unchanged and disabled. No real applications, hospital messages or payment actions.

Final pre-release run: all desktop/mobile flows passed against the final build, including both missing-soft and unverified-hard department groups; authenticated synthetic comparison rendered actual fixture rows. Public API returned 12 synthetic departments, 9 with recorded region and 12 with type. No answer-bearing/external requests during evaluation, no local/session storage, and no answer leakage in inspected local server logs. Desktop/mobile screenshots inspected. Empty guarded POSTs returned 403/PILOT_NOT_ENABLED. Final schema/package/placement/middleware diffs against production are empty.
