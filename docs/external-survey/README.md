# External resident conditions survey

This adds a separate `EXTERNAL_SURVEY` evidence source to the existing specialty directory and department experience area. It does not create `Review`, `ReviewSubmission`, `User`, or `Department` records. The existing questionnaire, moderation, verified-review scores, official metrics, search ordering and comparison logic are unchanged.

The initial source is the real workbook **מתמחים מדברים על תנאים (תגובות).xlsx**, SHA-256 `ef103a6fb9dc048b41db5713513bb624b5a96cbedb8a86b64304e0d8adb30424`. The source file, private reports, precise dates, gender and unapproved comments must not enter Git, public assets or deployment artifacts.

## Initial analysis

See `initial-analysis.json` for the aggregate data-quality report. There are 365 distinct responses, 28 specialty labels, 105 original institution strings and 88 original comments. No exact duplicate rows or duplicate timestamps were found. Two institution cells contain only whitespace. All other survey questions are populated; 277 optional tips are blank. A populated free-text field is not necessarily numerically usable.

26 specialties (362 responses) resolve to existing canonical IDs. Forensic and occupational medicine have no corresponding existing specialty; their three responses remain unmatched. Adult and child psychiatry remain separate. Explicit aliases prefer the main existing catalog IDs over duplicate legacy labels. No canonical institutions or specialties are created or renamed.

77 institution strings (317 responses) resolve to 36 existing institution IDs. 28 strings remain unmatched/ambiguous/missing (48 responses). HMO names resolve to HMOs, never to one of their hospitals. Generic Hadassah, Assuta, Rabin, geographic regions, generic ownership and unclear typos remain unresolved. Confidence is a deterministic mapping-rule confidence, not a statistically calibrated probability.

321 shift counts are parsed as exact values or clear ranges, one as a full-shift equivalent (excluded from count summaries), 42 remain ambiguous and one reversed range is invalid. 218 working-day intervals are clear, 146 ambiguous and one invalid. 252 salary values/ranges have clear units; 113 remain ambiguous. Bare `18` is not silently multiplied by 1,000. Salary retains gross/net/unknown basis, the basis source and report year; no salary is displayed. All four Likert fields parse to 1–5 with higher = better. Calm-on-call summaries also require a known positive shift count.

350 responses are from August 2024; 15 are from later months through September 2026. The UI calls these historical self-reports and explicitly states that most were collected in 2024. They are not a current measurement.

There are 11 nationwide specialty groups with at least one eligible metric, comprising 57 metrics at the per-metric n>=10 threshold. Two institution-specialty groups reach that numerical threshold; institution slices are **not published in v1**, to avoid nested-group inference and competitive hospital comparisons. Passing n>=10 does not itself grant privacy or publication approval.

## Data and security

- Five additive Prisma models store source rights, encrypted responses, mapping decisions, import runs and aggregates. No department ID exists on a survey response.
- AES-256-GCM encrypts exact original values and raw parser objects, with the source ID and fingerprint as authenticated context. The dedicated 32-byte `EXTERNAL_SURVEY_ENCRYPTION_KEY` is held in the existing protected hosting environment. Do not print or commit it. Back it up through the organization's approved secret-management process; rotation requires re-encrypting existing envelopes before retiring the old key.
- Normalized database fields contain no raw text. Exact timestamps are private database fields; gender and original comments are only in the encrypted envelope. Public summaries expose an explicit aggregate DTO only.
- The source ID plus a SHA-256 fingerprint of the 12 original cell values is unique. Row ordering has no effect. Re-import creates an audit import run but no duplicate responses. Changed source answers are distinct evidence; this dataset has no respondent ID with which to infer that they belong to the same person.
- Import and aggregation run in an advisory-locked transaction. The dataset hash includes normalized values and canonical assignments. Changing evidence invalidates previous privacy decisions and publication. The imported source is append-only; reconciliation of a materially revised source requires an operator review.
- No Excel upload endpoint, raw response API or public export is added. Original comments are available only through an operator CLI requiring an existing admin ID, the database credential and the encryption key. Exports are mode 0600 and refused inside the project/public directories.
- The runtime checks the existing verified-user access rule before reading aggregates. Unapproved sources return a generic empty state without counts or metrics. Neither guest HTML nor RSC receives protected data.
- Publication requires documented aggregate rights and a human privacy review of the exact dataset and explicit nationwide specialty groups. SQL constraints independently reject publishing small groups, institution slices, stale/unreviewed aggregates, or unapproved quotes.
- Every tip receives `HUMAN_REVIEW_REQUIRED`; regex flags are triage only and cannot establish that names, patient information, allegations or indirect identifiers are absent. No comment is automatically approved. Publishing a quote additionally requires separate source-level quotation rights, documented individual quotation permission, human content review and an exact-text match to the encrypted original. React escapes text.

## Operator CLI

Run from the repository with trusted environment variables. Use a direct database URL for migrations. The application retains its existing connection configuration. Never supply credentials as shell arguments.

```sh
npm run survey -- validate --file /absolute/private/source.xlsx
npm run survey -- dry-run --file /absolute/private/source.xlsx --out /absolute/private/new-report.survey-private.json
npm run survey -- import --file /absolute/private/source.xlsx
npm run survey -- aggregate
npm run survey -- status
npm run survey -- publish
```

`dry-run` may use `--catalog /absolute/private/catalog.json` for offline analysis. `import` always resolves the live database IDs. `publish` safely reports zero until the required rights and reviews exist. The CLI is an operator tool, not a replacement for web-user authentication.

`review-export --reviewer <existing-admin-id> --out <new-private-file>` exports mappings, private aggregates and the exact original tips for human review. Existing output files are never overwritten. Do not attach this export to public issues, PRs, Pages or logs.

`review-mapping --reviewer <existing-admin-id> --file <decision.json>` takes `sourceId`, `kind` (`SPECIALTY`/`INSTITUTION`), `rawValue`, an existing `targetId`, `rationale`, and `evidenceReference`. It invalidates publication. Re-import the original workbook to apply the reviewed ID and regenerate aggregates.

`rights --reviewer <existing-admin-id> --file <decision.json>` requires `sourceId`, `scope` (`AGGREGATES` or `QUOTES`), `status` (`DOCUMENTED` or `PENDING_PUBLICATION_RIGHTS`), and `evidenceReference`. Granting rights additionally requires the human attestations `authorizedBySurveyController: true` and `permitsHitmachutPublication: true`. These fields record a real reviewed authorization; setting them is not a substitute for obtaining it. Rights changes fail closed and require running `publish` again.

`review-privacy --reviewer <existing-admin-id> --file <decision.json>` requires `sourceId`, the current `datasetHash`, explicit nationwide `groupKeys`, `evidenceReference`, and human attestations `indirectIdentificationChecked`, `noDemographicSlices`, `smallGroupsSuppressed`, `noInstitutionComparisons`, and `historicalPeriodClear`. Review narrow groups, concentrated recruitment, unusually homogeneous metrics, institution concentration, overlapping source samples and auxiliary public information before approval. Only eligible metrics in the reviewed groups are approved.

`review-tip --reviewer <existing-admin-id> --file <decision.json>` takes `sourceId`, `fingerprint`, `status` (`APPROVED`/`REJECTED`), and `evidenceReference`. Approval also requires `exactText`, `individualPermissionReference`, and true human attestations `personalInformationChecked`, `patientInformationChecked`, `personalAllegationsChecked`, `indirectIdentificationChecked`, and `individualQuotePermissionVerified`. Reject sensitive or identifying text instead of publishing a generated rewrite. Approving a tip does not publish it.

Decisions record the admin, document hash and evidence reference. The existing audit log records decision requests, including failed requests; the source/mapping/tip records hold accepted evidence. Import history stores file hash, parser version and safe counts.

## Tests and deployment

```sh
SURVEY_SOURCE_PATH=/absolute/private/source.xlsx SURVEY_CATALOG_PATH=/absolute/private/catalog.json npm run test:survey
npx tsc --noEmit
npm run build
```

The real-file test must not be skipped in release verification: it verifies 365 responses, all 28 labels (26 resolvable), 88 exact tips, source hash and period, missing values, ambiguous institutions, psychiatry separation and per-metric privacy counts. Pure tests cover parsers, encryption integrity, access, DTO filtering and unchanged questionnaire/review/scoring/comparison files. Parser examples are unit-test inputs only; the import and visual QA use the actual workbook.

`tests/external-survey/database.integration.ts` refuses the production host and requires an explicit isolated branch host. It verifies migration behavior, 365 initial inserts, zero inserts on a reversed repeat, exact encrypted round trips, 88 pending tips, SQL privacy constraints and unchanged counts/checksums of existing users, reviews, departments and official metrics.

Apply only `202611020001_external_resident_survey` after validating it on a branch and checking prior migration history. It creates new tables/types/indexes; it does not update existing rows. It has bounded lock/statement timeouts. Import protected data, verify a repeated import and baseline checksums, deploy code with no domain assignment, smoke-test, then promote through the existing Vercel release workflow. A rollback can restore the previous app deployment while leaving the additive private tables intact; do not drop source data as a rollback shortcut.

Current rights decision from the site owner: no documented publication permission is available. Keep both rights scopes at `PENDING_PUBLICATION_RIGHTS`. The code may be deployed. No actual metrics or quotes may be released until the controller authorization and human privacy/content reviews described above are recorded.
