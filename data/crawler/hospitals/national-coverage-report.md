# National Hospital Crawler Coverage

- generatedAt: 2026-06-20T15:13:17.464Z
- total hospitals: 60
- total Master_Dept rows: 634
- rows with URLs: 321
- nearby doctor/team URL rows: 82
- Sheba: hard JS/API/502 case; deferred after national coverage

## Canonical Doctor / Link Counts
- ichilov: canonicalDoctors=72; doctorDepartmentLinks=72; productionReadyCanonicalDoctors=72; sourceUrlMatchLinks=0; reviewNeededLinks=72; duplicateProfileGroups 0 -> 0
- hadassah: canonicalDoctors=49; doctorDepartmentLinks=181; productionReadyCanonicalDoctors=49; sourceUrlMatchLinks=0; reviewNeededLinks=181; duplicateProfileGroups 0 -> 0
- meir: canonicalDoctors=17; doctorDepartmentLinks=17; productionReadyCanonicalDoctors=17; sourceUrlMatchLinks=12; reviewNeededLinks=5; duplicateProfileGroups 0 -> 0
- emek: canonicalDoctors=11; doctorDepartmentLinks=11; productionReadyCanonicalDoctors=4; sourceUrlMatchLinks=10; reviewNeededLinks=1; duplicateProfileGroups 2 -> 0
- carmel: canonicalDoctors=381; doctorDepartmentLinks=381; productionReadyCanonicalDoctors=380; sourceUrlMatchLinks=0; reviewNeededLinks=381; duplicateProfileGroups 54 -> 0
- kaplan: canonicalDoctors=17; doctorDepartmentLinks=17; productionReadyCanonicalDoctors=6; sourceUrlMatchLinks=1; reviewNeededLinks=16; duplicateProfileGroups 0 -> 0
- rabin: canonicalDoctors=37; doctorDepartmentLinks=37; productionReadyCanonicalDoctors=37; sourceUrlMatchLinks=0; reviewNeededLinks=37; duplicateProfileGroups 0 -> 0

## Wave 2 Results
- emek: readiness=needsHumanReview; reviewed=13; productionReady=7; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- carmel: readiness=needsHumanReview; reviewed=630; productionReady=629; canonicalDoctors=381; links=381; sourceUrlMatch=0; reviewNeeded=381; blocker=Canonicalization removed duplicate identity issue; department links still require review because source lineage is not row-specific.
- kaplan: readiness=needsHumanReview; reviewed=17; productionReady=6; canonicalDoctors=17; links=17; sourceUrlMatch=1; reviewNeeded=16; blocker=Profile URL coverage is below 50%.
- rabin: readiness=safeForFullBatch; reviewed=37; productionReady=37; canonicalDoctors=37; links=37; sourceUrlMatch=0; reviewNeeded=37; blocker=none

## Soroka
- Improved pilot available; full Soroka batch is not marked safe.
