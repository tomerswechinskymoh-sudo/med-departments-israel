# Hospital Crawler Autopilot

## CLI

```bash
npm run crawl -- --hospital sheba --mode plan
npm run crawl -- --hospital sheba --mode pilot
npm run crawl -- --hospital sheba --mode evaluate
npm run crawl -- --hospital sheba --mode full --confirm
npm run crawl -- --mode national-plan
npm run crawl -- --mode national-pilot --limit 3
npm run crawl -- --mode national-pilot --wave 2 --limit 5
npm run crawl -- --mode national-pilot --wave 3 --limit 5
npm run crawl -- --mode national-full-safe --confirm
```

## Modes

- `plan`: fetch known public URLs, inspect HTML, discover candidate doctor/team/index pages, write plan outputs.
- `pilot`: run a capped pilot on representative URLs, sample profile pages, write reviewed output and evaluation.
- `evaluate`: read the latest pilot evaluation.
- `full`: blocked unless readiness is `safeForFullBatch` and `--confirm` is supplied; provider-specific full adapters must still be added.
- `national-plan`: read `Master_Dept.csv`, create target registry, national crawl plan, waves, and coverage report. No crawling by default.
- `national-pilot`: run a limited safe wave. Current default Wave 1 is Ichilov, Hadassah, and Meir only. Use `--wave 2 --limit 5` for Master_Dept-driven Clalit pilot candidates. Use `--wave 3 --limit 5` for selected government/private pilots. Sheba and full Soroka remain excluded.
- `national-full-safe`: requires `--confirm`, but remains blocked until provider-specific full adapters exist.

## Outputs

```text
data/crawler/hospitals/<hospitalSlug>/plan.json
data/crawler/hospitals/<hospitalSlug>/plan.csv
data/crawler/hospitals/<hospitalSlug>/inspection.md
data/crawler/hospitals/<hospitalSlug>/doctor-index/doctors.json
data/crawler/hospitals/<hospitalSlug>/doctor-index/identity-map.json
data/crawler/hospitals/<hospitalSlug>/pilot/config.json
data/crawler/hospitals/<hospitalSlug>/pilot/evaluation.json
data/crawler/hospitals/<hospitalSlug>/reviewed/doctors-reviewed.json
data/crawler/hospitals/master-dept-targets.json
data/crawler/hospitals/master-dept-targets.csv
data/crawler/hospitals/national-crawl-plan.json
data/crawler/hospitals/national-crawl-plan.csv
data/crawler/hospitals/national-waves.json
data/crawler/hospitals/national-coverage-report.json
data/crawler/hospitals/national-coverage-report.md
```

## Master_Dept URL Priority

- `Master_Dept.csv` is the national source of truth for hospital, specialty, department/array, and row-level source URL targets.
- Row URLs are preserved as `sourceUrlRaw` and normalized as `sourceUrlNormalized`.
- URL status is explicit: `notProvided`, `pending`, `live`, `redirected`, `stale`, `forbidden`, or `failed`.
- Page type is classified as department, unit, array, hospital, doctors, team, or unknown.
- If a row URL is inspected and nearby doctor/team links are found, they are preserved in `nearbyDoctorOrTeamUrls`.
- Doctor outputs get Master_Dept mapping fields. Exact row-source matches and row-specific nearby team/doctor URLs can be marked `sourceUrlMatch`; ambiguous or global index matches stay `reviewNeeded`.
- Sheba is deferred to Wave 4 so it cannot block national coverage.

## Canonical Doctors And Department Links

- A canonical doctor is the doctor identity. A department link is the relationship between that identity and one Master_Dept row, department page, team page, or source URL.
- Canonical doctors are keyed by normalized absolute `profileUrl` when present. If no profile URL exists, the fallback key is `hospitalSlug + normalizedName`.
- The crawler never merges doctors across hospitals.
- The same profile URL can legitimately appear on multiple department or unit pages. That should create one canonical doctor plus multiple `doctorDepartmentLinks`, not duplicate doctor identities.
- Duplicate profile URLs are only a QA failure when they create duplicate canonical doctors after canonicalization.
- `sourceUrlMatch` is allowed only when a doctor was extracted from the exact Master_Dept row URL or from a row-specific nearby doctor/team URL discovered from that row.
- If the same doctor/team page is reachable from multiple Master_Dept rows, links stay `reviewNeeded` and carry `ambiguityReason`.
- Global hospital search, doctor indexes, and broad hospital-level discovery remain `reviewNeeded` until a human or stronger row-specific lineage confirms the department relationship.
- Broad fuzzy matching is still not allowed. The national crawler uses exact URL lineage, exact normalized names, and conservative hospital/specialty evidence only.

## Readiness

Readiness is split because a hospital can have a reliable doctor roster while still needing review for exact Master_Dept department mapping.

### Crawl Readiness

- `pilotReady`: enough candidate pages or doctor-index evidence to run a small pilot.
- `safeForFullBatch`: pilot has useful volume, high profile URL coverage, no duplicate profile URL issue.
- `needsCalibration`: parser quality issue, duplicate profile URLs, or suspected false positives above threshold.
- `needsAdapter`: a known public site exists, but no safe adapter/parser exists yet.
- `blocked`: known URLs failed or no doctor records were extracted.

### Mapping Readiness

- `sourceUrlMapped`: all doctor-department links are tied to exact Master_Dept row URLs or row-specific nearby doctor/team URLs.
- `partiallyMapped`: some links are row-specific, while others still need review.
- `hospitalRosterOnly`: doctor identities are useful at hospital level, but department mapping is not row-specific.
- `reviewNeeded`: links exist but are not trusted enough for department-level use.
- `blocked`: no usable links exist.

### Output Usability

- `hospitalRoster`: useful canonical doctor identities for a hospital, even if department mapping needs review.
- `departmentMappedRoster`: usable doctor-to-department links with at least partial source URL lineage.
- `notUsableYet`: no safe public output should be consumed downstream.

## Pass Criteria For A New Hospital

- URLs used are explicit.
- Doctor index existence is reported.
- Parser family is assigned.
- Pilot records preserve `rawText`, `sourceUrl`, profile URL when available, and QA flags.
- Evaluation reports production-ready count and blocker.
- Full batch is never the default path.

## Current Target Pilot Status

| Hospital | Parser family | Pilot result | Readiness |
| --- | --- | --- | --- |
| Sheba | `doctorIndexAssisted` / `jsDriven` | No safe pilot. Public doctors lobby returned `502`; shell pages exposed only low-text Angular HTML. Bundle references dev CMS/Elastic configuration, but the crawler does not use embedded credentials. | `blocked` |
| Ichilov | `searchDriven` | Uses the public doctor-search App Search endpoint discovered from the site bundle. Pilot extracted real doctor records with profile URLs. | `safeForFullBatch` |
| Hadassah | `searchDriven` | Uses the public `/api/doctors` endpoint discovered from the Next.js doctor-search bundle. Profile pages are limited shells, so API metadata is treated as partial profile evidence. | `safeForFullBatch` |
| Meir | `teamPage` | Uses Clalit team/staff pages. Pilot is restricted to team pages to avoid homepage/news prose false positives. | `safeForFullBatch` |

## Current Wave Notes

- Wave 1: Ichilov, Hadassah, and Meir produce useful hospital rosters; department mapping is strongest where source URLs are row-specific.
- Wave 2: Rabin remains crawl-safe as a hospital roster. Carmel needs human mapping review. Emek and Kaplan have partial source URL mapping but need calibration/review before controlled full.
- Wave 3: Maayanei Hayeshua produced the strongest pilot and is crawl-safe. Shamir, Galilee, and Laniado produced department-mapped pilots but need calibration or human review. Wolfson is blocked until a government-site adapter can extract doctors from its staff pages.
- Sheba remains deferred because its public doctors lobby is a hard JS/API case and must not block other national coverage work.
- Soroka remains excluded from full batch because the identity-map-assisted pilot improved quality, but the full candidate set still includes noisy inline/staff pages.
