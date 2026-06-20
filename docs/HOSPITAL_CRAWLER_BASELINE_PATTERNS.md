# Hospital Crawler Baseline Patterns

## Purpose

The crawler is moving from one Clalit/Rabin pipeline to a provider-agnostic hospital crawler.
The goal is still conservative: public hospital website data only, evidence preserved, no external enrichment, no automatic full batch.

## Core Baselines

### Rabin / Beilinson

- Provider family: Clalit.
- Pattern: classic `*_doctors.aspx` doctor-list pages.
- Signal: structured doctor cards, profile links usually present.
- Lesson: a department config plus list/profile/QA stages can produce stable reviewed output.

### Carmel

- Provider family: Clalit.
- Pattern: `*-team.aspx`, `*_team.aspx`, `MedicalStaffControl`, inline staff sections.
- Signal: team pages may use section headings such as medical staff or management.
- Lesson: parser must support team sections, not only classic doctor cards.

### Soroka

- Provider family: Clalit.
- Pattern: central doctor index plus noisy inline unit pages.
- Index: `https://hospitals.clalit.co.il/soroka/he/our-specialists/Pages/default.aspx`.
- Lesson: identity-map-assisted parsing improves precision and prevents prose fragments becoming doctor records.

## Generalization Targets

### Sheba

- Known URL: `https://www.sheba.co.il/lobbies-container/doctors-lobby`.
- Expected pattern: doctor lobby, possibly JS/API-backed.
- Current finding: public fetch returns a low-text Angular shell for main pages and `502` for the doctors lobby.
- Caution: the public JS bundle references dev CMS/Elastic hosts and a redacted search credential. Do not use embedded credentials; mark as blocked unless a public no-secret endpoint is confirmed.

### Ichilov / Tel Aviv Sourasky

- Known URL: `https://www.tasmc.org.il/doctorssearch/`.
- Pattern: search-driven doctor index.
- Current finding: the page bundle exposes a public Elastic App Search endpoint and public search key. The pilot adapter keeps only `/doctorssearch/dr/` profile URLs to avoid non-doctor staff cards.

### Hadassah

- Starting URL: `https://he.hadassah.org.il/medicine-specialization/internship-programs/`.
- Doctor index URL: `https://he.hadassah.org.il/doctor-search/`.
- Pattern: Next.js search page backed by public `/api/doctors`.
- Current finding: profile pages are limited shells, but the API returns names, roles, medical centers, departments, fields, and public phone values.

### Meir

- Known URL: `https://hospitals.clalit.co.il/meir/he/med/eyes/Pages/%D7%94%D7%A6%D7%95%D7%95%D7%AA-%D7%A9%D7%9C%D7%A0%D7%95.aspx`.
- Expected pattern: Clalit team or inline staff page.
- Current finding: team pages work with the generic Clalit parser. Homepage/news pages are noisy, so pilots should prefer team/staff pages and avoid prose/news extraction.

## Guardrails

- No Google, LinkedIn, ResearchGate, PubMed, ORCID, Doximity, or MoH license lookup.
- No automatic config deletion.
- No full batch unless readiness is `safeForFullBatch` and `--confirm` is supplied.
- No public export by default.
- Raw HTML/cache output should not be committed unless intentionally small and reviewed.
