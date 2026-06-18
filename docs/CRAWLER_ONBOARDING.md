# Clalit Crawler Onboarding

## Pipeline

1. Discover hospital doctor/team/staff pages.
2. Import reviewed discovery configs.
3. Crawl configured pages.
4. Enrich public profile pages.
5. Normalize already-scraped evidence.
6. Apply QA/manual review decisions.
7. Export public-safe run snapshots.

## Current Hospitals

- Rabin Medical Center
- Carmel Medical Center

## Key Scripts

- `npm run discover:clalit-hospital -- --hospital <slug>`
- `npm run compare:clalit-hospital-discovery -- --hospital <slug>`
- `npm run import:clalit-hospital-discovery -- --hospital <slug>`
- `npm run crawl:clalit-batch -- --config data/crawler/config/<slug>-all-discovered.json`
- `npm run backfill:clalit-reviewed-outputs -- --hospital <slug> --force`
- `npm run export:clalit-reviewed-doctors -- --hospital <slug>`
- `npm run verify:clalit-public-export -- --hospital <slug>`

## Guardrails

- No external enrichment in this crawler phase.
- Do not add Google, LinkedIn, ResearchGate, PubMed, ORCID, Doximity, or Ministry of Health license lookup.
- Do not delete existing crawler configs automatically.
- Use discovery drift reports before adding or removing candidates.
- Do not commit raw HTML snapshots or AI cache files.
- Do not refactor unrelated app code while working on the crawler.
