# Phase 4B — compact exploratory UI and separate department scores

2026-10-01. Independent ready capabilities implemented; validated-instrument integration and unsupported base cohorts remain guarded.

## Delivered

- `/career-fit`: compact desktop matrix (seven rows per section), mobile segmented rows, full unchanged 28 original Hebrew items/options/order and 16 editorial specialty profiles. Native radio keyboard behavior, back/edit/clear/reset and no neutral defaults. These remain **exploratory**, not validated MSPI content/scoring. Progress panel compacted and focus scrolling corrected.
- Reusable instrument renderer and typed authorized adapter/empty registry. MSPI pending status and official external link visible. [Instrument record](instrument-status.md) establishes historical editions separately and records unresolved current edition/scoring, rights and Hebrew evidence. No proprietary content or reconstructed key; no alternative personality test substituted.
- `/career-fit/departments`: prominent 0–100 **personal preference score**, explanatory contribution rows, editable weights including zero, independent direct entry. Separate **base department index** panel honestly shows insufficient comparable data. Component/fixed-cohort engine implemented and independently tested; no fake public scores.
- `/career-fit/methodology`: public instrument status, independent score meanings, formulas, current coverage and source limitations.

## Actual data and formulas

[Department methodology](department-score-methodology.md) and [machine-readable audit](metric-audit.json) record fields, sources, scope/period, coverage, direction, eligibility and missing policies. Audited existing schema/query access, source CSV definitions and actual permitted public catalog. No separate ENT import or restricted review/person record retrieval.

Base eligible: **0 departments / 0 specialties**. The source explicitly marks exam A/B pass rates and burnout as national specialty data; they cannot differentiate departments. Source CSV has 633 data rows, 588/611 numeric exam values and 633 burnout values, each constant within its specialty. Only two numeric senior counts; zero numeric publication/Duns entries in this source. Separate DB research/review fields exist but no compatible permitted multidimensional cohort with period/campus/sample provenance is established. This is not a claim that all database research/reviews are empty.

Public catalog: **586 departments, 28 specialty categories**. Personal institution preference is evaluable for 586/28; institution plus type for 575/28; 11 types unknown. Safely mapped recorded region: 0/586. Teaching, supervision, work environment, clinical exposure, research and size remain unsupported in this module.

Personal: `100 × sum(weight × exact match) / sum(selected supported soft weights)`; weights 0–3. Full selected-data coverage required. Hard known failures excluded; hard unknowns unverified. Unknown is never zero, and no denominator reduction. No active preferences => no score. No placement/acceptance or prestige factor.

Base: fixed specialty/period/reference IDs/bounds; normalized metric → within-family weighted mean → equal-weight family mean. At least two independent families; duplicate declared correlation groups rejected; exact specialty/campus/source/period matching and complete fixed core required. Otherwise null/INSUFFICIENT_COMPARABLE_DATA. No score changes from page filters/pagination. Explanations derive from the calculation. Equal family weights and normalization choices are editorial, not validated quality scales.

Read-only live example (demonstration preferences, not a hospital quality finding): general surgery, prefer Assuta Ashdod institution weight 3 and hospital type weight 1. Assuta Ashdod = **100/100** (75 institution +25 type); Bnai Zion = **25/100** (0+25). Both base indices are null. These values are computed from public facts, never hard-coded into UI. Full receipt: `/private/tmp/hitmachut-phase4b/real-score-audit.json`.

Robustness: no real base cohort, so real base weight sensitivity cannot be estimated. Synthetic arithmetic fixtures A=(80,50), B=(60,72) produce 65 and66; increasing the first family weight20% reverses their ordering. ±20% and leave-one-out diagnostics are tested and explicitly diagnostic-only. No weights tuned to favor any hospital. Personal equal-type departments tie; changing personal priorities changes only corresponding personal contributions. Unit/browser tests do not establish psychometric/clinical validity.

## Validation and privacy

27 algorithm/configuration checks passed (16 preserved +11 new): exact arithmetic/contributions, determinism, frozen-reference/filter independence, missingness, scope/campus/year/source, correlation groups, zero weights, unsupported metrics, hard/unverified groups, preserved item wording/order/scale and blocked registry. TypeScript and production build passed; existing Browserslist-age warning only. 34 placement mutation-handler guard checks passed.

Real Chrome 1440×1000 and390×844: complete questionnaire, space/arrow keyboard use, unknowns, insufficient suggestions, back/edit/reset, ties, continuation, direct entry, actual 100/100 personal score and explanations, zero-weight no-score, null base index, missing-soft/hard-unverified groups, authenticated synthetic comparison versus public login gate, API503/retry, public directory/login/branding/placements. Public catalog projection whitelist unchanged. Empty pre-write guard requests denied with403/PILOT_NOT_ENABLED; no application created. Final build browser rerun and live verification receipts recorded below.

Screenshots under `/private/tmp/hitmachut-phase4b/screenshots/`: local/live `matrix-desktop`, `matrix-mobile`, `scores-desktop`, `scores-mobile`, plus original journey captures. Inspected for RTL/readability/numeric clarity/overflow. Pixel-level testing found the site’s 15px root made rem-based targets 41.25px; explicit44px minima corrected this. Questionnaire response targets are asserted at least44px. Logs under `/private/tmp/hitmachut-phase4b/logs/`; request metadata and server logs inspected with no answer leakage. Answers remain in React memory; no local/session storage, answer URLs/analytics, account storage, representative access or new server data exposure.

## Release boundaries and prerequisites

Isolated release worktree based on live `5ad488d2ee47f04dbc398dff35d9622c2b780814`, existing dependency runtime and loopback synthetic DB only. Original dirty Phase3B work preserved; no schema, source CSV, existing specialty scoring/config, auth, API catalog, placement, dependency, job or flag changes. Current GitHub main protection and Vercel project/production branch inspected; same existing project and aliases.

Rollback: Phase4A deployment **dpl_AN3BznNixwGUJu7DDbHELQaPQfy5**, commit **5ad488d2ee47f04dbc398dff35d9622c2b780814**, URL https://project-2i9uv-denut4mob-tomerswechinskymoh-sudos-projects.vercel.app. Application-only rollback, no database changes.

Starting allowance **18% remaining (82% used)**. Target15%, hard13%; rounded account-wide telemetry, not exact task attribution. No model change/subagents/reset credits. Final reading appended with release receipt.

Placements stay **DEPLOYED_GUARDED — PILOT_NOT_ENABLED**. Admissions, uploads/documents, offerings and representative activation unchanged/disabled. No production seeds, applicant data copies, outreach, paid licenses, messages, jobs, DNS changes or unrelated product work.

Remaining gates: publisher-confirmed version/content/scoring/rights, Hebrew language/population evidence and separately reviewed Israeli mapping; department core admission requires compatible permitted provenance/period/campus/measurement/sample data and defensible independent dimensions. A sparse public record is not a poor department. No new collection or validation recruitment started.
