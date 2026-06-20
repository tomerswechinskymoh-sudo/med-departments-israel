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
npm run crawl -- --mode national-full-safe --confirm
```

## Modes

- `plan`: fetch known public URLs, inspect HTML, discover candidate doctor/team/index pages, write plan outputs.
- `pilot`: run a capped pilot on representative URLs, sample profile pages, write reviewed output and evaluation.
- `evaluate`: read the latest pilot evaluation.
- `full`: blocked unless readiness is `safeForFullBatch` and `--confirm` is supplied; provider-specific full adapters must still be added.
- `national-plan`: read `Master_Dept.csv`, create target registry, national crawl plan, waves, and coverage report. No crawling by default.
- `national-pilot`: run a limited safe wave. Current default Wave 1 is Ichilov, Hadassah, and Meir only. Use `--wave 2 --limit 5` for Master_Dept-driven Clalit pilot candidates; Sheba and full Soroka remain excluded.
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

## Readiness

- `pilotReady`: enough candidate pages or doctor-index evidence to run a small pilot.
- `safeForFullBatch`: pilot has useful volume, high profile URL coverage, no duplicate profile URL issue.
- `needsCalibration`: parser quality issue, duplicate profile URLs, or suspected false positives above threshold.
- `needsHumanReview`: useful pilot records exist but not enough safe coverage.
- `blocked`: known URLs failed or no doctor records were extracted.

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
