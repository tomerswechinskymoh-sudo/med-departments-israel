# Phase 4C — existing department data audit and guarded index

1 October 2026. **No defensible base-index cohort exists in current data: 0 specialties, 0 scored departments, 586 insufficient-data departments.** This is the result of an actual production aggregate audit, not an assumption from schema or the earlier CSV audit. No fabricated 0–100 base numbers were published.

## Findings and admission

Read [department-index-methodology.md](department-index-methodology.md) for every candidate/source/coverage/classification, the full 31-field live Department inventory, 22 imported metric keys and the 28-specialty eligibility table. [phase4c-data-audit.json](phase4c-data-audit.json) contains reproducible aggregate evidence and specialty counts.

- Published reviews: **0** in all visible departments, all populations. No resident teaching/work/development family can be admitted. Candidate family groupings are documented, not presented as observed components.
- Exams A/B: 555/26 and 573/27 departments/categories respectively; burnout 586/28. Each is constant within specialty; original definitions establish national specialty scope. Excluded from departmental scoring.
- OpenAlex: 1,190 records, 238 departments/26 categories, 2022–2026. Matching/ambiguity flags and incomplete 2026 remain. Publication output is context, not resident opportunity/training. No manual mapping review performed.
- Existing elective workbook: 527 hospital-specialty groups; 10,516 elective rating observations; 383 groups N≥5; survey 2020–2025; 526 groups manual-review flagged. One recommendation dimension, repeated elective observations and no canonical campus mapping. Context only; cannot replace resident experience. Historical transitions remain cohort association, not acceptance probability.
- DUNS100: 549 approved departmental recognition counts/28 categories. Explicitly excluded; no private ENT/MOH/external repository data used.
- Size/counts, waiting time, demand, duration and forecasts remain context. No independent size bonuses, prestige direction, or ungrounded personal probabilities. Salary/demographic mirrors remain context, not a department-performance core.
- Personal Match remains the Phase4B institution/type preference score: institution 586, verified type 575, recorded region 0. Actual Institution.region is NULL for every visible department. No new safe preference property admitted; waiting period/sample and structural campus/array scope are insufficient for added preferences.

## Calculation and safeguards

Version `2026-10-01.4c.1`. Engine now requires ≥3 independent families, unique source fields and correlation groups, frozen same-specialty reference IDs/bounds/period/campus/source and **100% complete fixed core**. Default equal family weights: 1 each, or 1/3 for three families. Fixed-linear metric `100×clamp((x−min)/(max−min),0,1)`, reversed only for a documented lower direction; weighted mean inside family, equal-weight mean across families. Ties remain ties; values clamp; final display integer only. There are no current admitted metric bounds/weights or published components. The rule was not weakened to produce more scores.

Resident survey metrics require **N≥5**, the existing elective-analysis display minimum, explicitly extended as an editorial minimum to verified resident measures. Separate populations and actual measurement period required; publication timestamp is not measurement period. No statistical shrinkage added. Incomplete/invalid observations => null/INSUFFICIENT_DATA, never 0. Core evidence coverage is separate; with no admitted observations it is 0%, not a claim that every site fact is missing. Engine explanation metadata carries formula inputs, components, weights/contributions, source fields, period, N/population, peer_group and version.

Personal `100×sum(weight×exact match)/sum(selected supported soft weights)` remains independent, weights 0–3, 100% selected-soft coverage; hard unknowns unverified, no active soft preference => null. User weights never enter the base index.

## Robustness

Actual base ±20% weight sensitivity, leave-one-out department rankings and specialty rank stability are **not estimable**: no scored real departments exist. No real stable/unstable winner can be identified. All base publication is withheld. Three-family synthetic diagnostics show modest weight changes can reverse ordering and exercise leave-one-out; they are arithmetic checks, not scientific validation. Missing-component stress, exact specialty/campus/year/source, duplicate metrics, N=1/4/5, separate populations, bounds and tied observations are tested. Real-data regression fixture covers all 586 public departments, national constancy and independent personal arithmetic; no famous-hospital winner expectations.

## UI and verification

`/career-fit/departments` shows separate base/personal panels, exact Hebrew insufficient-data state, index-data coverage, source limitations/version and “איך מחושב המדד?”. Personal scores remain numeric when selected facts are complete. Added explicit Personal Match/name sorting; base sorting is unavailable because no specialty has scored departments. Missing base evidence never changes ordering. Authenticated department pages reuse the index panel; existing comparison page explains the same insufficient-data status. Public department/comparison login gates remain.

TypeScript: passed. Scoring tests: **32 passed** (27 adapted existing +5 Phase4C real-data/sample tests). Production build: passed (existing Browserslist-age warning only). Placement inventory: **34 mutation handlers guarded**. Chrome local desktop 1440×1000/mobile390×844 full journeys passed: questionnaire/keyboard/unknown/back/reset, personal100/100 and zero-weight null, base null/coverage/explanation/methodology, sorting, no overflow, privacy/storage, public login gates, synthetic authenticated comparison and department, catalog allowlist, API503/retry and existing safe empty placement guard requests. Screenshots inspected for readability/RTL/overflow. Logs/screenshots are under `/private/tmp/hitmachut-phase4c/`.

## Release

Used the existing Phase4B release worktree/runtime and loopback synthetic database; original dirty Phase3B/source work was untouched. No schema/dependency/placement/query/catalog API change. Before release, GitHub main was inspected: branch protection API reported **not protected**; no bypass/force push or protection change. Existing Vercel project `project-2i9uv`, production branch main, existing aliases only.

Rollback: pre-Phase4C **6602a204cde92fe46f2f0803f4e0fddd5b508773**, READY **dpl_GwaBBZ1YACzQ5V7hXQB3Qdf41q8D**. Application-only rollback; no database writes/migration.

Starting allowance **16% remaining (84% used)**. Target14–15%, hard13%; account-wide rounded usage, not precise attribution. Final allowance/release/live receipt appended after deployment.

Placements remain **DEPLOYED_GUARDED — PILOT_NOT_ENABLED**. No bookings/uploads/offerings/representative activation, scraping, enrichment, outreach, psychometric validation or unrelated work.
