# Single30 specialty-fit release

Scope: existing hitmachut-phase4b-release worktree only. One original medical-context30-item questionnaire, six RIASEC dimensions; no specialty scoring or occupation-profile changes. Keep questionnaire navigation/persistence/review and result cards with nested technical explanation.

Removed obsolete user-facing pending-instrument card and links, old count copy, two-mode selection, extra-item results and old public methodology. Kept a compact landing information section and existing career journey. Removed only the `/career-fit` preview route gate. Old deep-mode drafts are rejected; existing matching quick/core drafts still restore. Historical research/data stays internal and does not add accessible questions.

Original medical items remain unvalidated. AI assistance is disclosed. No claim of professional manual review is added because none is recorded. No probability/accuracy claims. Occupational data: O*NET31.0 Database, USDOL/ETA, CC BY4.0; physician-row selection and Israeli crosswalk disclosed, original numeric values unchanged. Historical translated official O*NET items and their archives are excluded from this release commit; their original license notices remain in local historical materials. Current questions are original RIASEC-context items, not adaptations of official item wording.

Release files include only career-fit components/pages/model/draft/provenance/tests and this README/report. The resident-review link in the mixed methodology file is kept unstaged, along with all unrelated schema/review/admin/API changes. No migration, production-data write, placement activation or new deployment workflow. Existing GitHub origin/main → existing Vercel project deployment is used.

Preflight: origin/main e933809d98cfad8384f0762b5fd3dd62bc0ae351; local branch phase4c-department-index has an existing Phase4C documentation-only ancestor4bf45b7. Normal fast-forward push only; no history rewrite. Previous known production deployment dpl_HjEKagm79ko7B8hts6hyNXuprcZZ; latest live rollback reference verified separately before push.

Verification and release/live receipts are recorded after checks. Human content review, Hebrew construct validity, cultural equivalence, prospective accuracy and near-flat-profile stability remain limitations. No new psychometric validation claim.

## Final local release gate

TypeScript passed;46 career-fit tests passed; production build passed. No project-wide test/lint command is configured beyond the relevant script suites. Desktop1440×1000, tablet820×1180 and mobile390×844 complete browser journeys passed: single30, consent, all questions, section/direct navigation, skip=null, editing, autosave, refresh, completion review, deterministic17-specialty ranking, Top3, /100, simple explanations, supported cautions, nested technical disclosure, source/methodology pages, department CTA and reset. No stale instrument/mode/count copy, horizontal overflow, page errors or response writes. Mobile viewport visually inspected separately from full-page sticky-header captures.

The original browser typing error was fixed with an HTMLOptionElement instanceof type guard. Two release-harness issues were corrected without changing application/scoring behavior: omitted deliberately unusable database URLs (the existing header supports no-database rendering; public catalog is a local fixture), and opened the mobile overview before counting its accessible buttons. The entire gate was rerun and passed. Existing Browserslist-age and nested local-verifier lockfile warnings did not fail the build.

Final staged scope:33 files, all career-fit release code, content/provenance, verification and documentation. Existing unrelated dirty files hash-identical; the resident-review methodology link remains unstaged. Scoring, occupation profiles and30 question text match the prior snapshot byte-for-byte. Existing project/branch confirmed: project-2i9uv, GitHub main, default Next build, no migration. Rollback before release remains dpl_HjEKagm79ko7B8hts6hyNXuprcZZ / e933809d98cfad8384f0762b5fd3dd62bc0ae351.

Local logs/screenshots/receipts: /private/tmp/hitmachut-career-release/. Deployment/live result recorded separately after release.
