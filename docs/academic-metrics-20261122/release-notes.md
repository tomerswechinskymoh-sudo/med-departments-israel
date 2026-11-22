# Department academic metrics and separate IMA publication controls

Adds professor share beside senior physician count, initially missing. Department exam results A/B are stored independently from the national specialty rates that were copied into legacy department fields. Public profiles show both levels distinctly; new department values start as “הנתון עדיין לא סופק”. No source values are invented, overwritten or deleted.

Administrators can edit the three department percentages in the existing department editor. Empty is distinct from zero; only values between 0 and 100 are accepted. Changes are audited, admin-only, same-origin checked, and invalidate public caches. Existing title/explanation editing applies to the new metrics.

IMA finance, exam results and other specialty information have independent publication controls. The additive migration retains the existing financial/other-IMA/DUNS visibility and enables exams as requested. Source projection occurs before aggregation and again at the public cache boundary. Specialty exam results use specialty source records, not averages of copied department values.

Validation: 36 unit/regression checks, TypeScript, production build, database-backed profile/dashboard verification, and HTTP checks of authorization, validation, persistence, cache invalidation and all finance/exam combinations. The migration was tested against an isolated production branch; source-record fingerprints remained identical. Local browser inspection could not be completed because the computer-use tool timed out repeatedly; responsive styles were implemented but visual approval remains unverified.

Deployment applies only `20261122060000_split_ima_visibility`, with migration-history, endpoint and data-preservation guards in `scripts/academic-metrics/migrate.cjs`. The old deployed app remains compatible with the additive columns. No environment, access, domain or cron configuration changes are required.
