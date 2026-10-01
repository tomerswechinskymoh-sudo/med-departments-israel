# Hitmachut Department Index — 2026-10-01.4c.1

The production database was audited on 1 October 2026, using the 586 visible department IDs / 28 categories from the existing public catalog. No new collection, manual review or separate ENT repository was used. Schema presence was checked against actual aggregate coverage. Full machine-readable coverage and candidate decisions are in [phase4c-data-audit.json](phase4c-data-audit.json).

## Admission outcome

**No metric families are admitted. Zero departments in zero specialties have a defensible overall index. All 586 return `overall_score=null`, `status=INSUFFICIENT_DATA`.** The actual database has zero published Review rows for this cohort, of any respondent type. Research exists: 1,190 observations for 238 departments / 26 categories, five years 2022–2026; matching/ambiguity flags remain and 2026 is incomplete. Publication output cannot replace resident development experience.

The existing internship-elective analysis has 527 hospital-specialty groups, 10,516 scored elective observations, 383 groups with N≥5, survey years 2020–2025 and 526 groups flagged for manual review. These are repeated elective observations, not necessarily independent respondents. It provides one recommendation dimension and noncanonical department mappings, not three independent resident training dimensions. No recommendation/transition measure is admitted. Historical elective-to-residency linkage is an association within the survey cohort, never a person's probability of acceptance.

## Versioned engine and fixed core

A future admitted specialty/period/campus cohort must specify at least **three independent families**, frozen reference IDs (at least two departments), metric source fields, measurement period, directions, fixed bounds and correlation groups. Plausible survey families are training (teaching/approachability), work environment (atmosphere/lifestyle), and development (research exposure). These are candidate groupings, not established current components. Overall recommendation overlaps the same questionnaire and receives no extra weight. No current specialty has even one eligible resident family; the complete-core threshold is retained, not weakened for coverage.

For metric x, normalized score `n = 100 × clamp((x−min)/(max−min),0,1)`; reverse for documented lower-is-better. Bounds are frozen per same-specialty/period cohort, not recalculated by filters. On the documented 1–5 rating scale this would mean 1→0, 3→50, 5→100. Invalid/equal bounds reject the cohort. Ties remain equal; extreme values clamp. No cross-specialty normalization. No numeric counts gain a direction merely by being numeric.

Within family g, `C_g = Σ(a_m n_m)/Σ(a_m)`. Across families, `I = Σ(w_g C_g)/Σ(w_g)`, with equal family weights **1** by default (three families: **1/3 each**). Display rounds only the final result; explanation contributions retain full precision. No current numeric score exists to persist. Engine results carry overall_score, methodology_version, peer_group, component weights/scores/contributions, metric values/source field/source/period/transformation/sample N/population, coverage and limitations.

**100% complete fixed core**, at least three independent families, same specialty/campus/source/period and membership in the frozen reference cohort are required. Any missing core observation, unsuitable survey sample or invalid cohort gives null, never 0/100. Diagnostic reweighting never relaxes missingness. Equal-weight core coverage is completed families / fixed family count, separate from I. With no admitted cohort, coverage is 0% admitted index evidence; this does not mean no useful site facts exist. We do not renormalize a department's denominator after missingness, impute or rank missing departments below scored ones.

Survey policy reuses **N≥5**, the existing analysis public-display minimum (`src/server/jobs/analyze-internship-survey-electives.ts`, nScores≥5). That existing rule applied to elective ratings; adopting the same minimum for verified resident ratings is an explicit conservative editorial extension, not evidence of reliability. Published resident observations only, sample N and actual measurement period required; publication time is not the measurement period. Students/interns/residents cannot be pooled. There is no existing applicable shrinkage estimate to reuse; none introduced. Passing N alone cannot admit a cohort.

## Personal Match

Unchanged separate Phase4B calculation: `100 × Σ(weight × exactMatch)/Σ(selected supported soft weights)`, weights 0–3, full selected-soft coverage required. Known hard failures exclude; unknown hard constraints remain unverified. No selected weight means no score. Institution available 586/28; verified type 575/28; region 0 (all actual raw region fields NULL). No new safe size/wait/research preference observation was admitted: structural campus/array counts are context, wait lacks observation period/sample provenance, and research output is not opportunity. User weights cannot affect the base index.

## Candidate inventory

A=base, B=personal only, C=context, D=not usable now. Measurement period absent for undated imported metrics; database update times do not establish current status. Missing sample N is unknown, not zero. See JSON for per-specialty counts and duplicate groups.

| Field/source | Departments (numeric) / specialties | Period / population | Use and interpretation |
|---|---|---|---|
| אחוז_גברים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Demographic context; no better direction |
| אחוז_נשים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Demographic context; no better direction |
| זמן_המתנה_חציוני_לתקן / משרד הבריאות | 583 (583) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| מדד_שחיקה / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: National specialty aggregate; constant within specialty, not departmental performance |
| מספר גברים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Demographic context; no better direction |
| מספר המתקבלים שדיווחו שמצאו אחרי שנתיים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| מספר המתקבלים שדיווחו שמצאו מיד התמחות / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| מספר המתקבלים שדיווחו שמצאו עד חצי שנה / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| מספר המתקבלים שדיווחו שמצאו עד שנה / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| מספר המתקבלים שדיווחו שמצאו עד שנתיים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| מספר נשים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Demographic context; no better direction |
| מספר_בכירים / אתר המחלקה | 3 (2) / 3 | not recorded; update timestamp is not measurement period; N=None | C: Size/staffing context; overlapping structural counts, no size bonus |
| מספר_מתמחים / משרד הבריאות | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Size/staffing context; overlapping structural counts, no size bonus |
| מעבר_שלב_א / הר׳׳י | 555 (555) / 26 | not recorded; update timestamp is not measurement period; N=None | C: National specialty aggregate; constant within specialty, not departmental performance |
| מעבר_שלב_ב / הר׳׳י | 573 (573) / 27 | not recorded; update timestamp is not measurement period; N=None | C: National specialty aggregate; constant within specialty, not departmental performance |
| משך_התמחות_רשמי / הר׳׳י | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| משך_ממוצע_בפועל / משרד הבריאות | 485 (485) / 27 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| פער_שכר_פריפריה / סימולטור שכר של הר׳׳י | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Specialty salary assumptions; not department pay or training |
| צפי תקנים חדשים ב2026 / מספר התקנים הצפויים להיפתח במחלקה, נתון משוער ע׳׳פ התקנים שנפתחו בשנים הקודמות. | 586 (0) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| שכר_לא_פריפריה / סימולטור שכר של הר׳׳י | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Specialty salary assumptions; not department pay or training |
| שכר_פריפריה / סימולטור שכר של הר׳׳י | 586 (586) / 28 | not recorded; update timestamp is not measurement period; N=None | C: Specialty salary assumptions; not department pay or training |
| תת מחלקה / None | 158 (0) / 16 | not recorded; update timestamp is not measurement period; N=None | C: Structural/historical context; no common monotone training interpretation |
| Review.teachingQuality/seniorsApproachability / published verified resident reviews | 0 (n/a) / 0 | absent; N=0 | D: Potential training family; correlated teaching/approachability must stay one family |
| Review.workAtmosphere/lifestyleBalance / published verified resident reviews | 0 (n/a) / 0 | absent; N=0 | D: Potential work environment family |
| Review.researchExposure / published verified resident reviews | 0 (n/a) / 0 | absent; N=0 | D: Potential development experience family; no inference from publications |
| Review.overallRecommendation / published reviews | 0 (n/a) / 0 | absent; N=0 | D: Overlaps detailed experience; exclude independent bonus |
| DepartmentResearchMetric.publicationsCount / OpenAlex | 238 (n/a) / 26 | 2022–2026; 2026 partial; N=None | C: Research output context; not comparable opportunity or experience; ambiguity/mapping and size confounding |
| DepartmentExternalMetric.duns100PhysiciansCount / DUNS100 | 549 (n/a) / 28 | not recorded in metric; createdAt not observation year; N=None | C: Recognition only, explicitly excluded |
| DepartmentYearlyMetric.newResidents / MOH | 586 (n/a) / 28 | 2020–2024 actual; 2026 forecast separate; N=None | C: Starts/access and size; arrays/campuses require existing aggregation, no bonus |
| Institution.hospital / public effective catalog verified identity | 586 (n/a) / 28 | absent; N=None | B: Exact institution preference |
| Institution.type / public effective catalog verified identity | 575 (n/a) / 28 | absent; N=None | B: Verified effective institution type preference; 11 identity mismatches withheld |
| Institution.region / public effective catalog verified identity | 0 (n/a) / 0 | absent; N=None | D: Actual raw Institution.region is NULL for all 586; unavailable |
| Internship survey elective recommendation / linkage / existing Internship_Electives_Analysis.xlsx | None (n/a) / None | survey 2020–2025; elective date not fixed; N=10516 | C: 527 hospital-specialty groups; 383 at N>=5; one recommendation dimension; 526 flagged manual review. Historical association within cohort only, not personal acceptance probability |

All live Department scalar fields are inventoried, including identity, clinical descriptions, practical information, contacts, staffing, duration, exam mirrors, demographic/perk/candidate descriptions, institution/array mappings and provenance timestamps. These do not measure independent training outcomes. Counted field presence is not correctness or a quality bonus.

| Scalar field | Non-null/nonempty departments / specialties | Classification |
|---|---|---|
| id | 586 / 28 | D; identity/context only |
| institution_id | 586 / 28 | C; identity/context only |
| specialty_id | 586 / 28 | C; identity/context only |
| slug | 586 / 28 | D; identity/context only |
| name | 586 / 28 | C; identity/context only |
| short_summary | 586 / 28 | C; identity/context only |
| about | 586 / 28 | C; identity/context only |
| practical_info | 586 / 28 | C; identity/context only |
| public_contact_email | 410 / 26 | D; identity/context only |
| public_contact_phone | 38 / 22 | D; identity/context only |
| cover_image_url | 0 / 0 | D; identity/context only |
| future_enrichment_enabled | 586 / 28 | D; identity/context only |
| created_at | 586 / 28 | D; identity/context only |
| updated_at | 586 / 28 | D; identity/context only |
| candidate_preferences | 0 / 0 | C; identity/context only |
| contact_name | 513 / 26 | D; identity/context only |
| education_location_breakdown | 0 / 0 | C; identity/context only |
| expected_graduates_this_year | 0 / 0 | C; identity/context only |
| gender_balance | 0 / 0 | C; identity/context only |
| median_residency_length | 0 / 0 | C; identity/context only |
| new_residents_this_year | 586 / 28 | C; identity/context only |
| perks | 0 / 0 | C; identity/context only |
| residents_count | 586 / 28 | C; identity/context only |
| shlav_aleph_pass_rate | 555 / 26 | C; identity/context only |
| shlav_bet_pass_rate | 573 / 27 | C; identity/context only |
| website_url | 375 / 27 | C; identity/context only |
| medical_array_id | 201 / 4 | C; identity/context only |
| import_stable_key | 586 / 28 | D; identity/context only |
| application_url | 0 / 0 | C; identity/context only |
| data_source_notes | 586 / 28 | C; identity/context only |
| data_last_updated | 0 / 0 | C; identity/context only |

Other actual related data: DepartmentHead 541 records / 510 departments / 26 categories (roster context, not total specialist staffing); ResearchOpportunity 0; OfficialDepartmentUpdate 0; DepartmentExternalPerson 0. Duns recognition has 549 department counts and is excluded explicitly. Hospital beds/activity, ENT-only measures and private data never enter the general index.

## Per-specialty publication coverage

Median is admitted-index core coverage, not all database completeness. Main missing components for **every** row: resident training, work environment and development experience with comparable samples/periods.

| Specialty | Total | Eligible | Median coverage |
|---|---:|---:|---:|
| רפואת משפחה | 5 | 0 | 0% |
| אונקולוגיה | 18 | 0 | 0% |
| הרדמה | 25 | 0 | 0% |
| יילוד וגינקולוגיה | 27 | 0 | 0% |
| כירורגיה אורולוגית | 21 | 0 | 0% |
| כירורגיה אורתופדית | 27 | 0 | 0% |
| כירורגיה כללית | 34 | 0 | 0% |
| כירורגית ילדים | 6 | 0 | 0% |
| כירורגית כלי-דם | 14 | 0 | 0% |
| מחלות א.א.ג וכירורגיה של ראש וצוואר | 21 | 0 | 0% |
| מחלות עיניים | 21 | 0 | 0% |
| נוירולוגיה | 20 | 0 | 0% |
| פתולוגיה אבחנתית | 19 | 0 | 0% |
| קרדיולוגיה | 13 | 0 | 0% |
| רדיולוגיה אבחנתית | 24 | 0 | 0% |
| רפואה דחופה | 23 | 0 | 0% |
| רפואה פנימית | 106 | 0 | 0% |
| רפואת ילדים | 34 | 0 | 0% |
| כירורגיה פלסטית ואסתטית | 15 | 0 | 0% |
| כירורגיה של בית החזה | 12 | 0 | 0% |
| מחלות עור ומין | 7 | 0 | 0% |
| נוירוכירורגיה | 9 | 0 | 0% |
| רפואה גרעינית | 12 | 0 | 0% |
| גריאטריה | 23 | 0 | 0% |
| רפואה פיזיקלית ושיקום | 7 | 0 | 0% |
| פסיכיאטריה | 24 | 0 | 0% |
| פסיכיאטריה של הילד ומתבגר | 18 | 0 | 0% |
| בריאות הציבור | 1 | 0 | 0% |

## Robustness and limits

Real ±20% weight sensitivity, leave-one-component-out rankings and cohort rank stability are **not estimable**, because zero real base scores exist. No department can be identified as stably or unstably ranked. None is published. Synthetic three-family fixtures test ±20% and leave-one-out arithmetic and demonstrate a modest weight change can reverse ordering; they do not validate the product. Missing-data stress tests drop each component and keep null; tie, specialty mismatch, bounds, source/campus/year mismatch and duplicate-source/correlation checks are deterministic. The real 586-department regression fixture verifies zero scores, source national constancy and independent personal arithmetic. Before any future cohort publication, repeat actual ranking sensitivity/cohort stability and withhold unstable specialties; the empty registry cannot be silently populated by numeric availability.
