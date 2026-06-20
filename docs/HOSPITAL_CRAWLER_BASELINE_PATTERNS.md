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
- Current goal: discover whether doctor names/profile links are in HTML, JS state, or API responses.

### Ichilov / Tel Aviv Sourasky

- Known URL: `https://www.tasmc.org.il/doctorssearch/`.
- Expected pattern: search-driven doctor index, possibly JS/API-backed.
- Current goal: find result source and profile URL coverage.

### Hadassah

- Starting URL: `https://he.hadassah.org.il/medicine-specialization/internship-programs/`.
- Expected risk: page may describe internship programs rather than doctors.
- Current goal: report if better doctor/team URLs are required; do not guess silently.

### Meir

- Known URL: `https://hospitals.clalit.co.il/meir/he/med/eyes/Pages/%D7%94%D7%A6%D7%95%D7%95%D7%AA-%D7%A9%D7%9C%D7%A0%D7%95.aspx`.
- Expected pattern: Clalit team or inline staff page.
- Current goal: compare parser family to Carmel/Soroka without running a full batch.

## Guardrails

- No Google, LinkedIn, ResearchGate, PubMed, ORCID, Doximity, or MoH license lookup.
- No automatic config deletion.
- No full batch unless readiness is `safeForFullBatch` and `--confirm` is supplied.
- No public export by default.
- Raw HTML/cache output should not be committed unless intentionally small and reviewed.
