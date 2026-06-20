# Hospital Crawler Autopilot

## CLI

```bash
npm run crawl -- --hospital sheba --mode plan
npm run crawl -- --hospital sheba --mode pilot
npm run crawl -- --hospital sheba --mode evaluate
npm run crawl -- --hospital sheba --mode full --confirm
```

## Modes

- `plan`: fetch known public URLs, inspect HTML, discover candidate doctor/team/index pages, write plan outputs.
- `pilot`: run a capped pilot on representative URLs, sample profile pages, write reviewed output and evaluation.
- `evaluate`: read the latest pilot evaluation.
- `full`: blocked unless readiness is `safeForFullBatch` and `--confirm` is supplied; provider-specific full adapters must still be added.

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
```

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
