# National Hospital Crawler Coverage

- generatedAt: 2026-06-21T10:38:12.102Z
- total hospitals: 60
- total Master_Dept rows: 634
- rows with URLs: 321
- nearby doctor/team URL rows: 26
- attempted hospitals: 23
- usable hospital rosters: 19
- usable department-mapped rosters: 14
- remaining unattempted queue: 46
- Sheba: hard JS/API/502 case; deferred after national coverage

## URL Status
- pending: 228
- notProvided: 313
- live: 53
- forbidden: 36
- redirected: 4

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
  - needsCalibration: 17
  - safeForFullBatch: 5
  - blocked: 2
- mappingReadiness
  - blocked: 5
  - sourceUrlMapped: 5
  - reviewNeeded: 2
  - partiallyMapped: 9
  - hospitalRosterOnly: 3
- usable hospital rosters: barzilai, carmel, emek, galilee, hadassah, hillel-yaffe, holy-family, ichilov, kaplan, laniado, maayanei-hayeshua, meir, nazareth-scottish, poria, rabin, saint-vincent, schneider, shamir, soroka
- usable department-mapped rosters: barzilai, emek, galilee, hillel-yaffe, holy-family, kaplan, laniado, maayanei-hayeshua, meir, nazareth-scottish, poria, saint-vincent, schneider, shamir
- not usable yet: assuta-ashdod, bnei-zion, sheba, wolfson, ziv

## Hospital Split Readiness
- assuta-ashdod: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- barzilai: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=19; links=19; sourceUrlMatch=19; reviewNeeded=0
- bnei-zion: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- carmel: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=381; links=381; sourceUrlMatch=0; reviewNeeded=381
- emek: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1
- galilee: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=30; links=30; sourceUrlMatch=24; reviewNeeded=6
- hadassah: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=49; links=181; sourceUrlMatch=0; reviewNeeded=181
- hillel-yaffe: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=25; links=25; sourceUrlMatch=25; reviewNeeded=0
- holy-family: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=26; links=26; sourceUrlMatch=20; reviewNeeded=6
- ichilov: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=72; links=72; sourceUrlMatch=0; reviewNeeded=72
- kaplan: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=17; links=17; sourceUrlMatch=1; reviewNeeded=16
- laniado: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=12; links=12; sourceUrlMatch=6; reviewNeeded=6
- maayanei-hayeshua: crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=27; links=27; sourceUrlMatch=25; reviewNeeded=2
- meir: crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=17; links=17; sourceUrlMatch=12; reviewNeeded=5
- nazareth-scottish: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=14; links=14; sourceUrlMatch=14; reviewNeeded=0
- poria: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=20; links=20; sourceUrlMatch=20; reviewNeeded=0
- rabin: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=37; links=37; sourceUrlMatch=0; reviewNeeded=37
- saint-vincent: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=16; links=16; sourceUrlMatch=15; reviewNeeded=1
- schneider: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=15; links=15; sourceUrlMatch=15; reviewNeeded=0
- shamir: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1
- sheba: crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- soroka: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- wolfson: crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- ziv: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0

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
- hillel-yaffe: rawReviewedRows=25; canonicalDoctors=25; doctorDepartmentLinks=25; expectedDistinctLinks=25; productionReadyCanonicalDoctors=24; sourceUrlMatchLinks=25; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- barzilai: rawReviewedRows=19; canonicalDoctors=19; doctorDepartmentLinks=19; expectedDistinctLinks=19; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=19; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- holy-family: rawReviewedRows=26; canonicalDoctors=26; doctorDepartmentLinks=26; expectedDistinctLinks=26; productionReadyCanonicalDoctors=7; sourceUrlMatchLinks=20; reviewNeededLinks=6; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- saint-vincent: rawReviewedRows=16; canonicalDoctors=16; doctorDepartmentLinks=16; expectedDistinctLinks=16; productionReadyCanonicalDoctors=2; sourceUrlMatchLinks=15; reviewNeededLinks=1; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- poria: rawReviewedRows=20; canonicalDoctors=20; doctorDepartmentLinks=20; expectedDistinctLinks=20; productionReadyCanonicalDoctors=19; sourceUrlMatchLinks=20; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- nazareth-scottish: rawReviewedRows=14; canonicalDoctors=14; doctorDepartmentLinks=14; expectedDistinctLinks=14; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=14; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- bnei-zion: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- schneider: rawReviewedRows=15; canonicalDoctors=15; doctorDepartmentLinks=15; expectedDistinctLinks=15; productionReadyCanonicalDoctors=4; sourceUrlMatchLinks=15; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- assuta-ashdod: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- ziv: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0

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
- hillel-yaffe: מרכז רפואי הלל יפה; rows=19; URLs=9; live=9; nearby=9; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline hillel-yaffe; 9 Master_Dept URLs; 9 live inspected URLs; 9 nearby doctor/team URLs
- barzilai: מרכז רפואי ברזילי; rows=25; URLs=7; live=7; nearby=7; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline barzilai; 7 Master_Dept URLs; 7 live inspected URLs; 7 nearby doctor/team URLs
- holy-family: ביה"ח המשפחה הקדושה; rows=6; URLs=6; live=6; nearby=6; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline holy-family; 6 Master_Dept URLs; 6 live inspected URLs; 6 nearby doctor/team URLs
- saint-vincent: ביה"ח הצרפתי; rows=4; URLs=4; live=4; nearby=4; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline saint-vincent; 4 Master_Dept URLs; 4 live inspected URLs; 4 nearby doctor/team URLs
- poria: מרכז רפואי ברוך פדה פוריה; rows=16; URLs=13; live=13; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; mode=pilot only; reason=Wave3 baseline poria; 13 Master_Dept URLs; 13 live inspected URLs

## Wave 3 Results
- shamir: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=12; productionReady=7; sourceUrlMatch=11; reviewNeeded=1; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- maayanei-hayeshua: readiness=safeForFullBatch; crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=27; productionReady=27; sourceUrlMatch=25; reviewNeeded=2; blocker=none
- galilee: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=30; productionReady=6; sourceUrlMatch=24; reviewNeeded=6; blocker=Profile URL coverage is below 50%.
- laniado: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=18; productionReady=12; sourceUrlMatch=12; reviewNeeded=6; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- wolfson: readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blocker=Pilot extracted zero doctor records.

## National Sweep Queue
- hillel-yaffe: מרכז רפואי הלל יפה; priority=high; action=pilot; rows=19; URLs=9; live=9; nearby=9; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=9 Master_Dept URLs; 9 live/redirected URLs; 9 nearby doctor/team rows; synthetic generic parser
- barzilai: מרכז רפואי ברזילי; priority=high; action=pilot; rows=25; URLs=7; live=7; nearby=7; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=7 Master_Dept URLs; 7 live/redirected URLs; 7 nearby doctor/team rows; synthetic generic parser
- holy-family: ביה"ח המשפחה הקדושה; priority=high; action=pilot; rows=6; URLs=6; live=6; nearby=6; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=6 Master_Dept URLs; 6 live/redirected URLs; 6 nearby doctor/team rows; synthetic generic parser
- saint-vincent: ביה"ח הצרפתי; priority=high; action=pilot; rows=4; URLs=4; live=4; nearby=4; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=4 Master_Dept URLs; 4 live/redirected URLs; 4 nearby doctor/team rows; synthetic generic parser
- poria: מרכז רפואי ברוך פדה פוריה; priority=high; action=pilot; rows=16; URLs=13; live=13; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=13 Master_Dept URLs; 13 live/redirected URLs; synthetic generic parser
- nazareth-scottish: ביה"ח אי.מ.מ.ס הסקוטי; priority=high; action=pilot; rows=10; URLs=8; live=8; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=8 Master_Dept URLs; 8 live/redirected URLs; synthetic generic parser
- bnei-zion: מרכז רפואי בני ציון; priority=high; action=pilot; rows=21; URLs=20; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=20 Master_Dept URLs; synthetic generic parser
- schneider: מרכז שניידר לילדים; priority=medium; action=pilot; rows=6; URLs=6; live=6; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=6 Master_Dept URLs; 6 live/redirected URLs; synthetic generic parser
- assuta-ashdod: בי"ח אסותא אשדוד; priority=medium; action=pilot; rows=18; URLs=4; live=4; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=4 Master_Dept URLs; 4 live/redirected URLs; synthetic generic parser
- ziv: ביה"ח זיו - צפת; priority=medium; action=pilot; rows=20; URLs=16; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=16 Master_Dept URLs; synthetic generic parser
- geha: מרכז לבה"נ גהה; priority=low; action=pilot; rows=2; URLs=2; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=2 Master_Dept URLs; synthetic generic parser
- shalvata: מרכז לבה"נ שלוותה; priority=low; action=pilot; rows=2; URLs=2; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=2 Master_Dept URLs; synthetic generic parser
- maale-hacarmel: מרכז לבה"נ מעלה הכרמל; priority=low; action=pilot; rows=2; URLs=2; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=2 Master_Dept URLs; synthetic generic parser
- merhavim: מרחבים - המרכז הרפואי לטיפול במוח ובנפש באר יעקב נס ציונה; priority=low; action=pilot; rows=2; URLs=2; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=2 Master_Dept URLs; synthetic generic parser
- hospital-3a3abf9b65: מרכז לבה"נ אברבנאל; priority=low; action=pilot; rows=2; URLs=2; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=2 Master_Dept URLs; synthetic generic parser
- hospital-fa8413a9cd: מרכז לבה"נ ירושלים (כפר שאול ואיתנים); priority=low; action=pilot; rows=2; URLs=2; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=2 Master_Dept URLs; synthetic generic parser
- clalit-community: שירותי בריאות כללית; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- lev-hasharon: מרכז לבה"נ לב השרון; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-a3603919b1: אסיא ש.בריאות קהילתיים; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-08078cfe7d: מכבי שירותי בריאות; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-8d011027af: קופ"ח לאומית; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-793e6e1bce: קופ"ח מאוחדת; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-138ed619c5: מרכז לבה"נ מזור; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-1839a655ed: מרכז לבה"נ שער מנשה; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser
- hospital-692f2e5753: מ.גריאטרי שהם; priority=low; action=pilot; rows=1; URLs=1; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=1 Master_Dept URLs; synthetic generic parser

## National Sweep Results
- hillel-yaffe: action=pilot; readiness=safeForFullBatch; crawlReadiness=safeForFullBatch; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=25; productionReady=24; sourceUrlMatch=25; reviewNeeded=0; blockerType=none; blocker=none
- barzilai: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=19; productionReady=0; sourceUrlMatch=19; reviewNeeded=0; blockerType=other; blocker=Profile URL coverage is below 50%.
- holy-family: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=26; productionReady=7; sourceUrlMatch=20; reviewNeeded=6; blockerType=other; blocker=Profile URL coverage is below 50%.
- saint-vincent: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=16; productionReady=2; sourceUrlMatch=15; reviewNeeded=1; blockerType=other; blocker=Profile URL coverage is below 50%.
- poria: action=pilot; readiness=safeForFullBatch; crawlReadiness=safeForFullBatch; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=20; productionReady=19; sourceUrlMatch=20; reviewNeeded=0; blockerType=none; blocker=none
- nazareth-scottish: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=14; productionReady=0; sourceUrlMatch=14; reviewNeeded=0; blockerType=other; blocker=Profile URL coverage is below 50%.
- bnei-zion: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- schneider: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=15; productionReady=4; sourceUrlMatch=15; reviewNeeded=0; blockerType=other; blocker=Profile URL coverage is below 50%.
- assuta-ashdod: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- ziv: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.

## Blockers
- none: 2
- other: 5
- noPublicRosterFound: 3

## Top Next Adapter Priorities
- shaare-zedek: מרכז רפואי שערי צדק; rows=27; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- rambam: מרכז רפואי רמב"ם; rows=24; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- yoseftal: ביה"ח יוספטל; rows=2; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- beer-sheva-mental-health: מרכז לבה"נ באר שבע; rows=2; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- hospital-c693b49d6d: מרכז בריאות הנפש רמת חן ע"ש בריל; rows=2; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- hospital-f15ccc8f1f: מרכז רפואי רעות; rows=1; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- hospital-f5503acbbd: ביה"ח הרצוג; rows=1; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser
- hospital-ef6fbb03f7: מ.גריאטרי פלימן; rows=1; URLs=0; live=0; nearby=0; reason=no row URLs or no direct pilot source; adapter inspection first; no Master_Dept URLs; synthetic generic parser

## Next
- Continue national-sweep in batches of 10; prioritize adapterInspect hospitals with many live Master_Dept URLs.

## Soroka
- Improved pilot available; full Soroka batch is not marked safe.