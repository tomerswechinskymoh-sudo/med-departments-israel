# National Hospital Crawler Coverage

- generatedAt: 2026-06-21T10:16:23.421Z
- total hospitals: 60
- total Master_Dept rows: 634
- rows with URLs: 321
- nearby doctor/team URL rows: 13
- Sheba: hard JS/API/502 case; deferred after national coverage

## URL Status
- pending: 242
- notProvided: 313
- live: 71
- forbidden: 8

## Provider Guess
- hadassah: 2
- clalit: 15
- ichilov: 1
- government: 11
- private: 6
- unknown: 24
- sheba: 1

## Readiness
- safeForFullBatch: 4
- safeForPilot: 19
- pending: 24
- needsAdapter: 12
- deferred: 1

## Split Readiness
- crawlReadiness
  - needsCalibration: 7
  - safeForFullBatch: 5
  - blocked: 2
- mappingReadiness
  - reviewNeeded: 2
  - partiallyMapped: 7
  - hospitalRosterOnly: 3
  - blocked: 2
- usable hospital rosters: carmel, emek, galilee, hadassah, ichilov, kaplan, laniado, maayanei-hayeshua, meir, rabin, shamir, soroka
- usable department-mapped rosters: emek, galilee, kaplan, laniado, maayanei-hayeshua, meir, shamir
- not usable yet: sheba, wolfson

## Hospital Split Readiness
- carmel: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=381; links=381; sourceUrlMatch=0; reviewNeeded=381
- emek: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1
- galilee: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=30; links=30; sourceUrlMatch=24; reviewNeeded=6
- hadassah: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=49; links=181; sourceUrlMatch=0; reviewNeeded=181
- ichilov: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=72; links=72; sourceUrlMatch=0; reviewNeeded=72
- kaplan: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=17; links=17; sourceUrlMatch=1; reviewNeeded=16
- laniado: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=12; links=12; sourceUrlMatch=6; reviewNeeded=6
- maayanei-hayeshua: crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=27; links=27; sourceUrlMatch=25; reviewNeeded=2
- meir: crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=17; links=17; sourceUrlMatch=12; reviewNeeded=5
- rabin: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=37; links=37; sourceUrlMatch=0; reviewNeeded=37
- shamir: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1
- sheba: crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- soroka: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- wolfson: crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0

## Wave 1 Counts
- Master_Dept hospital groups: 4
- attempted hospitals: 3
- successful hospitals: 3
- deferred hospitals: 0
- blocked hospitals: 0

## Wave 1 Results
- ichilov: readiness=safeForFullBatch; reviewed=72; productionReady=72; mapped=72
- hadassah: readiness=safeForFullBatch; reviewed=49; productionReady=49; mapped=49
- meir: readiness=safeForFullBatch; reviewed=17; productionReady=17; mapped=17

## Wave 1 Mapping
- ichilov: sourceUrlMatch 0 -> 0; reviewNeeded 72 -> 72; ambiguous 72 -> 72; unmapped 0 -> 0
- hadassah: sourceUrlMatch 0 -> 0; reviewNeeded 49 -> 49; ambiguous 49 -> 49; unmapped 0 -> 0
- meir: sourceUrlMatch 12 -> 12; reviewNeeded 5 -> 5; ambiguous 5 -> 5; unmapped 0 -> 0

## Canonical Doctor / Link Counts
- ichilov: rawReviewedRows=72; canonicalDoctors=72; doctorDepartmentLinks=72; expectedDistinctLinks=72; productionReadyCanonicalDoctors=72; sourceUrlMatchLinks=0; reviewNeededLinks=72; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- hadassah: rawReviewedRows=49; canonicalDoctors=49; doctorDepartmentLinks=181; expectedDistinctLinks=181; productionReadyCanonicalDoctors=49; sourceUrlMatchLinks=0; reviewNeededLinks=181; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- meir: rawReviewedRows=17; canonicalDoctors=17; doctorDepartmentLinks=17; expectedDistinctLinks=17; productionReadyCanonicalDoctors=17; sourceUrlMatchLinks=12; reviewNeededLinks=5; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- emek: rawReviewedRows=13; canonicalDoctors=11; doctorDepartmentLinks=11; expectedDistinctLinks=11; productionReadyCanonicalDoctors=4; sourceUrlMatchLinks=10; reviewNeededLinks=1; rawRowsDroppedAsExactDuplicates=2; duplicateProfileGroups 2 -> 0
- carmel: rawReviewedRows=630; canonicalDoctors=381; doctorDepartmentLinks=381; expectedDistinctLinks=381; productionReadyCanonicalDoctors=380; sourceUrlMatchLinks=0; reviewNeededLinks=381; rawRowsDroppedAsExactDuplicates=249; duplicateProfileGroups 54 -> 0
- kaplan: rawReviewedRows=17; canonicalDoctors=17; doctorDepartmentLinks=17; expectedDistinctLinks=17; productionReadyCanonicalDoctors=6; sourceUrlMatchLinks=1; reviewNeededLinks=16; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- rabin: rawReviewedRows=37; canonicalDoctors=37; doctorDepartmentLinks=37; expectedDistinctLinks=37; productionReadyCanonicalDoctors=37; sourceUrlMatchLinks=0; reviewNeededLinks=37; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- shamir: rawReviewedRows=12; canonicalDoctors=11; doctorDepartmentLinks=11; expectedDistinctLinks=11; productionReadyCanonicalDoctors=6; sourceUrlMatchLinks=10; reviewNeededLinks=1; rawRowsDroppedAsExactDuplicates=1; duplicateProfileGroups 1 -> 0
- maayanei-hayeshua: rawReviewedRows=27; canonicalDoctors=27; doctorDepartmentLinks=27; expectedDistinctLinks=27; productionReadyCanonicalDoctors=27; sourceUrlMatchLinks=25; reviewNeededLinks=2; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- galilee: rawReviewedRows=30; canonicalDoctors=30; doctorDepartmentLinks=30; expectedDistinctLinks=30; productionReadyCanonicalDoctors=6; sourceUrlMatchLinks=24; reviewNeededLinks=6; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- laniado: rawReviewedRows=18; canonicalDoctors=12; doctorDepartmentLinks=12; expectedDistinctLinks=12; productionReadyCanonicalDoctors=6; sourceUrlMatchLinks=6; reviewNeededLinks=6; rawRowsDroppedAsExactDuplicates=6; duplicateProfileGroups 6 -> 0
- wolfson: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0

## Wave 2 Selected
- emek: מרכז רפואי העמק; rows=27; URLs=27; nearby=0; mode=pilot only; reason=known adapter emek; 27 Master_Dept URLs; URLs pending inspection; 1 direct staff/doctors URLs
- carmel: מרכז רפואי כרמל; rows=25; URLs=22; nearby=0; mode=pilot only; reason=known adapter carmel; 22 Master_Dept URLs; URLs pending inspection; 1 direct staff/doctors URLs
- kaplan: מרכז רפואי קפלן; rows=25; URLs=22; nearby=0; mode=pilot only; reason=known adapter kaplan; 22 Master_Dept URLs; URLs pending inspection
- rabin: ביה"ח בילינסון מרכז רפואי רבין / מרכז רפואי רבין / ביה"ח השרון מרכז רפואי רבין; rows=60; URLs=11; nearby=0; mode=pilot only; reason=known adapter rabin; 11 Master_Dept URLs; URLs pending inspection

## Wave 2 Results
- emek: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=13; productionReady=7; sourceUrlMatch=11; reviewNeeded=2; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- carmel: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; reviewed=630; productionReady=629; sourceUrlMatch=0; reviewNeeded=630; blocker=Canonicalization removed duplicate identity issue; department links still require review because source lineage is not row-specific.
- kaplan: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=17; productionReady=6; sourceUrlMatch=1; reviewNeeded=16; blocker=Profile URL coverage is below 50%.
- rabin: readiness=safeForFullBatch; crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; reviewed=37; productionReady=37; sourceUrlMatch=0; reviewNeeded=37; blocker=none

## Wave 3 Selected
- shamir: מרכז רפואי יצחק שמיר; rows=27; URLs=26; live=26; nearby=7; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline shamir; 26 Master_Dept URLs; 26 live inspected URLs; 7 nearby doctor/team URLs
- maayanei-hayeshua: ביה"ח מעיני הישועה; rows=6; URLs=6; live=6; nearby=6; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline maayanei-hayeshua; 6 Master_Dept URLs; 6 live inspected URLs; 6 nearby doctor/team URLs; 2 direct staff/doctors URLs
- galilee: המרכז הרפואי לגליל; rows=29; URLs=28; live=28; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; mode=pilot only; reason=Wave3 baseline galilee; 28 Master_Dept URLs; 28 live inspected URLs
- laniado: ביה"ח לניאדו; rows=11; URLs=11; live=11; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; mode=pilot only; reason=Wave3 baseline laniado; 11 Master_Dept URLs; 11 live inspected URLs
- wolfson: מרכז רפואי וולפסון; rows=25; URLs=8; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline wolfson; 8 Master_Dept URLs; URLs pending inspection; 4 direct staff/doctors URLs

## Wave 3 Results
- shamir: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=12; productionReady=7; sourceUrlMatch=11; reviewNeeded=1; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- maayanei-hayeshua: readiness=safeForFullBatch; crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=27; productionReady=27; sourceUrlMatch=25; reviewNeeded=2; blocker=none
- galilee: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=30; productionReady=6; sourceUrlMatch=24; reviewNeeded=6; blocker=Profile URL coverage is below 50%.
- laniado: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=18; productionReady=12; sourceUrlMatch=12; reviewNeeded=6; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- wolfson: readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blocker=Pilot extracted zero doctor records.

## Next
- Review Wave3 output quality, then select the next 3-5 hospitals; keep Sheba deferred and Soroka full batch blocked.

## Soroka
- Improved pilot available; full Soroka batch is not marked safe.