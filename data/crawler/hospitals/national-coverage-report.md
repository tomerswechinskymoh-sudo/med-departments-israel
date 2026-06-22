# National Hospital Crawler Coverage

- generatedAt: 2026-06-22T14:06:40.663Z
- total hospitals: 60
- total Master_Dept rows: 634
- rows with URLs: 321
- nearby doctor/team URL rows: 17
- attempted hospitals: 53
- usable hospital rosters: 26
- usable department-mapped rosters: 15
- previous department-mapped rosters: 14
- department-mapped roster count note: Current count uses stricter outputUsability classification: only sourceUrlMapped/partiallyMapped link evidence counts as departmentMappedRoster; hospital-level/global rosters stay hospitalRoster.
- attempted department-mapped rosters: 13
- attempted hospital-roster-only: 9
- attempted but no doctors: 32
- blocked hospitals: 35
- deferred hospitals: 1
- not attempted hospitals: 7
- remaining unattempted queue: 2
- Sheba: hard JS/API/502 case; deferred after national coverage

## URL Status
- pending: 290
- notProvided: 313
- live: 31

## Provider Guess
- hadassah: 2
- clalit: 15
- ichilov: 1
- government: 11
- private: 6
- unknown: 24
- sheba: 1

## Institution Taxonomy
- total hospital groups by type
  - acuteHospital: 28
  - psychiatricHospital: 11
  - healthFund: 5
  - privateNetwork: 3
  - geriatricHospital: 11
  - rehabilitationHospital: 1
  - unknown: 1
- usable roster by type
  - acuteHospital: 16
  - psychiatricHospital: 5
  - unknown: 2
  - privateNetwork: 2
  - healthFund: 1
- blocked by type
  - acuteHospital: 7
  - psychiatricHospital: 6
  - geriatricHospital: 11
  - healthFund: 4
  - privateNetwork: 1
  - unknown: 5
  - rehabilitationHospital: 1
- remaining unattempted by type
  - acuteHospital: 2

## Readiness
- safeForFullBatch: 4
- safeForPilot: 19
- pending: 24
- needsAdapter: 12
- deferred: 1

## Split Readiness
- crawlReadiness
  - needsCalibration: 54
  - safeForFullBatch: 5
  - blocked: 2
- mappingReadiness
  - blocked: 35
  - sourceUrlMapped: 5
  - reviewNeeded: 8
  - partiallyMapped: 10
  - hospitalRosterOnly: 3
- usable hospital rosters: barzilai, carmel, emek, galilee, geha, hadassah, hillel-yaffe, holy-family, hospital-fa8413a9cd, ichilov, jerusalem-mental-health-kfar-shaul-eitanim, kaplan, laniado, leumit-health-fund, maale-hacarmel, maayanei-hayeshua, meir, nazareth-scottish, poria, rabin, saint-vincent, schneider, shalvata, shamir, soroka, yoseftal
- usable department-mapped rosters: barzilai, emek, galilee, hillel-yaffe, holy-family, kaplan, laniado, leumit-health-fund, maayanei-hayeshua, meir, nazareth-scottish, poria, saint-vincent, schneider, shamir
- not usable yet: 0504048312, abrabanel-mental-health, adi-negev-nahalat-eden, asia-community-health-services, assuta-ashdod, beer-sheva-mental-health, beit-balev-rishon-lezion, beit-rivka-geriatric, bnei-zion, clalit-community, fliman-geriatric, forensic-medicine, herzfeld-geriatric, herzog-medical-center, hospital-08078cfe7d, hospital-3a3abf9b65, hospital-a3603919b1, lev-hasharon, loewenstein-rehabilitation, maccabi-health-services, mazor-mental-health, merhavim, meuhedet-health-fund, neot-hamoshava-geriatric, netanya-geriatric, ramat-chen-brill-mental-health, rambam, reuth-medical-center, shaar-menashe-mental-health, shaare-zedek, sheba, shmuel-harofe-geriatric, shoham-geriatric, wolfson, ziv

## Hospital Split Readiness
- 0504048312: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- abrabanel-mental-health: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- adi-negev-nahalat-eden: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- asia-community-health-services: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- assuta-ashdod: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- barzilai: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=19; links=19; sourceUrlMatch=19; reviewNeeded=0
- beer-sheva-mental-health: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- beit-balev-rishon-lezion: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- beit-rivka-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- bnei-zion: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- carmel: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=381; links=381; sourceUrlMatch=0; reviewNeeded=381
- clalit-community: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- emek: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1
- fliman-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- forensic-medicine: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- galilee: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=30; links=30; sourceUrlMatch=24; reviewNeeded=6
- geha: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=4; links=4; sourceUrlMatch=0; reviewNeeded=4
- hadassah: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=49; links=181; sourceUrlMatch=0; reviewNeeded=181
- herzfeld-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- herzog-medical-center: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- hillel-yaffe: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=25; links=25; sourceUrlMatch=25; reviewNeeded=0
- holy-family: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=35; links=35; sourceUrlMatch=29; reviewNeeded=6
- hospital-08078cfe7d: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- hospital-3a3abf9b65: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- hospital-a3603919b1: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- hospital-fa8413a9cd: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=2; links=2; sourceUrlMatch=0; reviewNeeded=2
- ichilov: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=72; links=72; sourceUrlMatch=0; reviewNeeded=72
- jerusalem-mental-health-kfar-shaul-eitanim: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=2; links=2; sourceUrlMatch=0; reviewNeeded=2
- kaplan: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=17; links=17; sourceUrlMatch=1; reviewNeeded=16
- laniado: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=12; links=12; sourceUrlMatch=6; reviewNeeded=6
- leumit-health-fund: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=20; links=20; sourceUrlMatch=1; reviewNeeded=0
- lev-hasharon: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- loewenstein-rehabilitation: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- maale-hacarmel: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=1; links=2; sourceUrlMatch=0; reviewNeeded=2
- maayanei-hayeshua: crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=27; links=27; sourceUrlMatch=25; reviewNeeded=2
- maccabi-health-services: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- mazor-mental-health: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- meir: crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=17; links=17; sourceUrlMatch=12; reviewNeeded=5
- merhavim: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- meuhedet-health-fund: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- nazareth-scottish: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=20; links=20; sourceUrlMatch=20; reviewNeeded=0
- neot-hamoshava-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- netanya-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- poria: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=20; links=20; sourceUrlMatch=20; reviewNeeded=0
- rabin: crawlReadiness=safeForFullBatch; mappingReadiness=hospitalRosterOnly; output=hospitalRoster; canonicalDoctors=37; links=37; sourceUrlMatch=0; reviewNeeded=37
- ramat-chen-brill-mental-health: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- rambam: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- reuth-medical-center: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- saint-vincent: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=36; links=36; sourceUrlMatch=35; reviewNeeded=1
- schneider: crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; canonicalDoctors=20; links=20; sourceUrlMatch=20; reviewNeeded=0
- shaar-menashe-mental-health: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- shaare-zedek: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- shalvata: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=3; links=4; sourceUrlMatch=0; reviewNeeded=4
- shamir: crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; canonicalDoctors=11; links=11; sourceUrlMatch=10; reviewNeeded=1
- sheba: crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- shmuel-harofe-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- shoham-geriatric: crawlReadiness=needsCalibration; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- soroka: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- wolfson: crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; canonicalDoctors=0; links=0; sourceUrlMatch=0; reviewNeeded=0
- yoseftal: crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; canonicalDoctors=18; links=18; sourceUrlMatch=0; reviewNeeded=18
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
- barzilai: rawReviewedRows=19; canonicalDoctors=19; doctorDepartmentLinks=19; expectedDistinctLinks=19; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=19; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- nazareth-scottish: rawReviewedRows=20; canonicalDoctors=20; doctorDepartmentLinks=20; expectedDistinctLinks=20; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=20; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- schneider: rawReviewedRows=20; canonicalDoctors=20; doctorDepartmentLinks=20; expectedDistinctLinks=20; productionReadyCanonicalDoctors=4; sourceUrlMatchLinks=20; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- holy-family: rawReviewedRows=35; canonicalDoctors=35; doctorDepartmentLinks=35; expectedDistinctLinks=35; productionReadyCanonicalDoctors=7; sourceUrlMatchLinks=29; reviewNeededLinks=6; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- saint-vincent: rawReviewedRows=36; canonicalDoctors=36; doctorDepartmentLinks=36; expectedDistinctLinks=36; productionReadyCanonicalDoctors=1; sourceUrlMatchLinks=35; reviewNeededLinks=1; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- rambam: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- yoseftal: rawReviewedRows=18; canonicalDoctors=18; doctorDepartmentLinks=18; expectedDistinctLinks=18; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=18; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- beer-sheva-mental-health: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- shaare-zedek: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- geha: rawReviewedRows=4; canonicalDoctors=4; doctorDepartmentLinks=4; expectedDistinctLinks=4; productionReadyCanonicalDoctors=2; sourceUrlMatchLinks=0; reviewNeededLinks=4; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- shalvata: rawReviewedRows=3; canonicalDoctors=3; doctorDepartmentLinks=4; expectedDistinctLinks=4; productionReadyCanonicalDoctors=3; sourceUrlMatchLinks=0; reviewNeededLinks=4; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- clalit-community: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- maccabi-health-services: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- maale-hacarmel: rawReviewedRows=1; canonicalDoctors=1; doctorDepartmentLinks=2; expectedDistinctLinks=2; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=2; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- jerusalem-mental-health-kfar-shaul-eitanim: rawReviewedRows=2; canonicalDoctors=2; doctorDepartmentLinks=2; expectedDistinctLinks=2; productionReadyCanonicalDoctors=2; sourceUrlMatchLinks=0; reviewNeededLinks=2; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- lev-hasharon: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- asia-community-health-services: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- merhavim: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- abrabanel-mental-health: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- leumit-health-fund: rawReviewedRows=20; canonicalDoctors=20; doctorDepartmentLinks=20; expectedDistinctLinks=20; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=1; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- meuhedet-health-fund: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- mazor-mental-health: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- shaar-menashe-mental-health: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- shoham-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- bnei-zion: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- ziv: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- assuta-ashdod: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- ramat-chen-brill-mental-health: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- reuth-medical-center: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- herzog-medical-center: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- fliman-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- beit-rivka-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- shmuel-harofe-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- neot-hamoshava-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- herzfeld-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- beit-balev-rishon-lezion: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- netanya-geriatric: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- adi-negev-nahalat-eden: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- loewenstein-rehabilitation: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- 0504048312: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- forensic-medicine: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- hillel-yaffe: rawReviewedRows=25; canonicalDoctors=25; doctorDepartmentLinks=25; expectedDistinctLinks=25; productionReadyCanonicalDoctors=24; sourceUrlMatchLinks=25; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- hospital-08078cfe7d: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- hospital-3a3abf9b65: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- hospital-a3603919b1: rawReviewedRows=0; canonicalDoctors=0; doctorDepartmentLinks=0; expectedDistinctLinks=0; productionReadyCanonicalDoctors=0; sourceUrlMatchLinks=0; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- hospital-fa8413a9cd: rawReviewedRows=2; canonicalDoctors=2; doctorDepartmentLinks=2; expectedDistinctLinks=2; productionReadyCanonicalDoctors=2; sourceUrlMatchLinks=0; reviewNeededLinks=2; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0
- poria: rawReviewedRows=20; canonicalDoctors=20; doctorDepartmentLinks=20; expectedDistinctLinks=20; productionReadyCanonicalDoctors=19; sourceUrlMatchLinks=20; reviewNeededLinks=0; rawRowsDroppedAsExactDuplicates=0; duplicateProfileGroups 0 -> 0

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
- galilee: המרכז הרפואי לגליל; rows=29; URLs=28; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; mode=pilot only; reason=Wave3 baseline galilee; 28 Master_Dept URLs; URLs pending inspection
- shamir: מרכז רפואי יצחק שמיר; rows=27; URLs=26; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; mode=pilot only; reason=Wave3 baseline shamir; 26 Master_Dept URLs; URLs pending inspection
- laniado: ביה"ח לניאדו; rows=11; URLs=11; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; mode=pilot only; reason=Wave3 baseline laniado; 11 Master_Dept URLs; URLs pending inspection
- wolfson: מרכז רפואי וולפסון; rows=25; URLs=8; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline wolfson; 8 Master_Dept URLs; URLs pending inspection; 4 direct staff/doctors URLs
- maayanei-hayeshua: ביה"ח מעיני הישועה; rows=6; URLs=6; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; mode=pilot only; reason=Wave3 baseline maayanei-hayeshua; 6 Master_Dept URLs; URLs pending inspection; 2 direct staff/doctors URLs

## Wave 3 Results
- shamir: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=12; productionReady=7; sourceUrlMatch=11; reviewNeeded=1; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- maayanei-hayeshua: readiness=safeForFullBatch; crawlReadiness=safeForFullBatch; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=27; productionReady=27; sourceUrlMatch=25; reviewNeeded=2; blocker=none
- galilee: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=30; productionReady=6; sourceUrlMatch=24; reviewNeeded=6; blocker=Profile URL coverage is below 50%.
- laniado: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=18; productionReady=12; sourceUrlMatch=12; reviewNeeded=6; blocker=Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full.
- wolfson: readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blocker=Pilot extracted zero doctor records.

## Calibration Results
- barzilai: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=19; productionReady=0; sourceUrlMatch=19; reviewNeeded=0; blocker=Profile URL coverage is below 50%.
- nazareth-scottish: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=20; productionReady=0; sourceUrlMatch=20; reviewNeeded=0; blocker=Profile URL coverage is below 50%.
- schneider: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=sourceUrlMapped; output=departmentMappedRoster; reviewed=20; productionReady=4; sourceUrlMatch=20; reviewNeeded=0; blocker=Profile URL coverage is below 50%.
- holy-family: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=35; productionReady=7; sourceUrlMatch=29; reviewNeeded=6; blocker=Profile URL coverage is below 50%.
- saint-vincent: readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=36; productionReady=1; sourceUrlMatch=35; reviewNeeded=1; blocker=Profile URL coverage is below 50%.

## Adapter Priority Results
- rambam: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- yoseftal: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; reviewed=18; productionReady=0; blockerType=other; blocker=Profile URL coverage is below 50%.
- beer-sheva-mental-health: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- shaare-zedek: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; blockerType=needsManualSeedUrl; blocker=No safe seed URL is available yet; manual seed URL verification required.

## National Sweep Queue
- sheba: מרכז רפואי שיבא; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=defer; rows=38; URLs=3; live=0; nearby=0; expectedCrawl=blocked; expectedMapping=reviewNeeded; reason=explicitly deferred hard case; 3 Master_Dept URLs; parser=doctorIndexAssisted+jsDriven+unknown
- soroka: מרכז רפואי סורוקה; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=defer; rows=34; URLs=3; live=0; nearby=0; expectedCrawl=blocked; expectedMapping=reviewNeeded; reason=explicitly deferred hard case; 3 Master_Dept URLs; parser=inlineStaff+doctorIndexAssisted
- barzilai: מרכז רפואי ברזילי; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=25; URLs=7; live=7; nearby=7; expectedCrawl=needsAdapter; expectedMapping=partiallyMapped; reason=already has usable prior output; 7 Master_Dept URLs; 7 live/redirected URLs; 7 nearby doctor/team rows; synthetic generic parser
- holy-family: ביה"ח המשפחה הקדושה; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=6; URLs=6; live=6; nearby=6; expectedCrawl=needsAdapter; expectedMapping=partiallyMapped; reason=already has usable prior output; 6 Master_Dept URLs; 6 live/redirected URLs; 6 nearby doctor/team rows; synthetic generic parser
- saint-vincent: ביה"ח הצרפתי; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=4; URLs=4; live=4; nearby=4; expectedCrawl=needsAdapter; expectedMapping=partiallyMapped; reason=already has usable prior output; 4 Master_Dept URLs; 4 live/redirected URLs; 4 nearby doctor/team rows; synthetic generic parser
- nazareth-scottish: ביה"ח אי.מ.מ.ס הסקוטי; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=10; URLs=8; live=8; nearby=0; expectedCrawl=needsAdapter; expectedMapping=reviewNeeded; reason=already has usable prior output; 8 Master_Dept URLs; 8 live/redirected URLs; synthetic generic parser
- schneider: מרכז שניידר לילדים; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=6; URLs=6; live=6; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 6 Master_Dept URLs; 6 live/redirected URLs; synthetic generic parser
- galilee: המרכז הרפואי לגליל; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=29; URLs=28; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 28 Master_Dept URLs; parser=inlineStaff+teamPage+unknown
- emek: מרכז רפואי העמק; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=27; URLs=27; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=already has usable prior output; 27 Master_Dept URLs; 1 direct staff/doctors URLs; parser=teamPage+inlineStaff+classicDoctorCards
- shamir: מרכז רפואי יצחק שמיר; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=27; URLs=26; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 26 Master_Dept URLs; parser=inlineStaff+teamPage+unknown
- meir: מרכז רפואי מאיר; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=24; URLs=24; live=0; nearby=0; expectedCrawl=safeForFullBatch; expectedMapping=reviewNeeded; reason=already has usable prior output; 24 Master_Dept URLs; parser=teamPage+inlineStaff+unknown
- carmel: מרכז רפואי כרמל; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=25; URLs=22; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=already has usable prior output; 22 Master_Dept URLs; 1 direct staff/doctors URLs; parser=teamPage+inlineStaff
- kaplan: מרכז רפואי קפלן; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=25; URLs=22; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 22 Master_Dept URLs; parser=teamPage+inlineStaff+classicDoctorCards
- bnei-zion: מרכז רפואי בני ציון; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=21; URLs=20; live=0; nearby=0; expectedCrawl=needsAdapter; expectedMapping=reviewNeeded; reason=already has usable prior output; 20 Master_Dept URLs; synthetic generic parser
- ziv: ביה"ח זיו - צפת; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=20; URLs=16; live=0; nearby=0; expectedCrawl=needsAdapter; expectedMapping=reviewNeeded; reason=already has usable prior output; 16 Master_Dept URLs; synthetic generic parser
- poria: מרכז רפואי ברוך פדה פוריה; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=16; URLs=13; live=0; nearby=0; expectedCrawl=needsAdapter; expectedMapping=reviewNeeded; reason=already has usable prior output; 13 Master_Dept URLs; synthetic generic parser
- laniado: ביה"ח לניאדו; type=privateNetwork; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=11; URLs=11; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 11 Master_Dept URLs; parser=inlineStaff+teamPage+unknown
- hadassah: ביה"ח הדסה הר הצופים; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=13; URLs=10; live=0; nearby=0; expectedCrawl=safeForFullBatch; expectedMapping=reviewNeeded; reason=already has usable prior output; 10 Master_Dept URLs; parser=searchDriven+jsDriven+unknown
- hillel-yaffe: מרכז רפואי הלל יפה; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=19; URLs=9; live=0; nearby=0; expectedCrawl=needsAdapter; expectedMapping=reviewNeeded; reason=already has usable prior output; 9 Master_Dept URLs; synthetic generic parser
- wolfson: מרכז רפואי וולפסון; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=25; URLs=8; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=already has usable prior output; 8 Master_Dept URLs; 4 direct staff/doctors URLs; parser=teamPage+inlineStaff+unknown
- rabin: ביה"ח השרון מרכז רפואי רבין; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=12; URLs=7; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 7 Master_Dept URLs; parser=classicDoctorCards+teamPage
- hadassah: ביה"ח הדסה עין כרם; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=30; URLs=6; live=0; nearby=0; expectedCrawl=safeForFullBatch; expectedMapping=reviewNeeded; reason=already has usable prior output; 6 Master_Dept URLs; parser=searchDriven+jsDriven+unknown
- maayanei-hayeshua: ביה"ח מעיני הישועה; type=privateNetwork; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=6; URLs=6; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=partiallyMapped; reason=already has usable prior output; 6 Master_Dept URLs; 2 direct staff/doctors URLs; parser=teamPage+inlineStaff+unknown
- rabin: מרכז רפואי רבין; type=acuteHospital; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=24; URLs=4; live=0; nearby=0; expectedCrawl=pilotReady; expectedMapping=reviewNeeded; reason=already has usable prior output; 4 Master_Dept URLs; parser=classicDoctorCards+teamPage
- assuta-ashdod: בי"ח אסותא אשדוד; type=privateNetwork; residencyCandidate=true; crawlPriority=high; priority=low; action=skipAlreadyUsable; rows=18; URLs=4; live=0; nearby=0; expectedCrawl=needsAdapter; expectedMapping=reviewNeeded; reason=already has usable prior output; 4 Master_Dept URLs; synthetic generic parser

## National Sweep Results
- geha: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; reviewed=4; productionReady=4; sourceUrlMatch=0; reviewNeeded=4; blockerType=other; blocker=Pilot has useful records but insufficient production-ready coverage.
- shalvata: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; reviewed=3; productionReady=3; sourceUrlMatch=0; reviewNeeded=3; blockerType=other; blocker=Pilot has useful records but insufficient production-ready coverage.
- clalit-community: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- maccabi-health-services: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- maale-hacarmel: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; reviewed=1; productionReady=0; sourceUrlMatch=0; reviewNeeded=1; blockerType=other; blocker=Profile URL coverage is below 50%.
- jerusalem-mental-health-kfar-shaul-eitanim: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=reviewNeeded; output=hospitalRoster; reviewed=2; productionReady=2; sourceUrlMatch=0; reviewNeeded=2; blockerType=other; blocker=Pilot has useful records but insufficient production-ready coverage.
- lev-hasharon: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- asia-community-health-services: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- merhavim: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- abrabanel-mental-health: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- leumit-health-fund: action=pilot; readiness=needsHumanReview; crawlReadiness=needsCalibration; mappingReadiness=partiallyMapped; output=departmentMappedRoster; reviewed=20; productionReady=0; sourceUrlMatch=1; reviewNeeded=0; blockerType=other; blocker=Profile URL coverage is below 50%.
- meuhedet-health-fund: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- mazor-mental-health: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- shaar-menashe-mental-health: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- shoham-geriatric: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noPublicRosterFound; blocker=Pilot extracted zero doctor records.
- rambam: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- bnei-zion: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=siteBlocked; blocker=Site blocked automated public fetch (403/captcha/bot protection).
- ziv: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=siteBlocked; blocker=Site blocked automated public fetch (403/captcha/bot protection).
- assuta-ashdod: action=pilot; readiness=blocked; crawlReadiness=blocked; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=siteBlocked; blocker=Site blocked automated public fetch (403/captcha/bot protection).
- ramat-chen-brill-mental-health: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- reuth-medical-center: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- herzog-medical-center: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- fliman-geriatric: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- beit-rivka-geriatric: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- shmuel-harofe-geriatric: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- neot-hamoshava-geriatric: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- herzfeld-geriatric: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- beit-balev-rishon-lezion: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- netanya-geriatric: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- adi-negev-nahalat-eden: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- loewenstein-rehabilitation: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- 0504048312: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.
- forensic-medicine: action=adapterInspect; readiness=needsAdapter; crawlReadiness=needsAdapter; mappingReadiness=blocked; output=notUsableYet; reviewed=0; productionReady=0; sourceUrlMatch=0; reviewNeeded=0; blockerType=noMasterDeptSourceUrl; blocker=No Master_Dept source URLs available; seed registry did not provide a safe pilot URL.

## Hospital Normalization
- opaque slug count: 0

## Seed URL Registry
- beer-sheva-mental-health: seeds=1; safe=1; needsManualSeedUrl=false
- rambam: seeds=1; safe=1; needsManualSeedUrl=false
- shaare-zedek: seeds=1; safe=0; needsManualSeedUrl=true
- yoseftal: seeds=1; safe=1; needsManualSeedUrl=false

## Blockers
- noPublicRosterFound: 12
- other: 6
- needsManualSeedUrl: 1
- noMasterDeptSourceUrl: 15
- siteBlocked: 3

## Top Next Adapter Priorities
- barzilai: מרכז רפואי ברזילי; rows=25; URLs=7; live=7; nearby=7; reason=already has usable prior output; 7 Master_Dept URLs; 7 live/redirected URLs; 7 nearby doctor/team rows; synthetic generic parser
- holy-family: ביה"ח המשפחה הקדושה; rows=6; URLs=6; live=6; nearby=6; reason=already has usable prior output; 6 Master_Dept URLs; 6 live/redirected URLs; 6 nearby doctor/team rows; synthetic generic parser
- saint-vincent: ביה"ח הצרפתי; rows=4; URLs=4; live=4; nearby=4; reason=already has usable prior output; 4 Master_Dept URLs; 4 live/redirected URLs; 4 nearby doctor/team rows; synthetic generic parser
- nazareth-scottish: ביה"ח אי.מ.מ.ס הסקוטי; rows=10; URLs=8; live=8; nearby=0; reason=already has usable prior output; 8 Master_Dept URLs; 8 live/redirected URLs; synthetic generic parser
- bnei-zion: מרכז רפואי בני ציון; rows=21; URLs=20; live=0; nearby=0; reason=already has usable prior output; 20 Master_Dept URLs; synthetic generic parser
- ziv: ביה"ח זיו - צפת; rows=20; URLs=16; live=0; nearby=0; reason=already has usable prior output; 16 Master_Dept URLs; synthetic generic parser
- poria: מרכז רפואי ברוך פדה פוריה; rows=16; URLs=13; live=0; nearby=0; reason=already has usable prior output; 13 Master_Dept URLs; synthetic generic parser
- hillel-yaffe: מרכז רפואי הלל יפה; rows=19; URLs=9; live=0; nearby=0; reason=already has usable prior output; 9 Master_Dept URLs; synthetic generic parser

## Next
- Continue national-sweep in batches of 10; prioritize adapterInspect hospitals with many live Master_Dept URLs.

## Soroka
- Improved pilot available; full Soroka batch is not marked safe.