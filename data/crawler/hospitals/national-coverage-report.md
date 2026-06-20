# National Hospital Crawler Coverage

- generatedAt: 2026-06-20T15:13:17.464Z
- total hospitals: 60
- total Master_Dept rows: 634
- rows with URLs: 321
- nearby doctor/team URL rows: 82
- Sheba: hard JS/API/502 case; deferred after national coverage

## URL Status
- pending: 239
- notProvided: 313
- live: 82

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
- safeForPilot: 14
- needsAdapter: 17
- pending: 24
- deferred: 1

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

## Wave 2 Selected
- emek: מרכז רפואי העמק; rows=27; URLs=27; nearby=27; mode=pilot only; reason=known adapter emek; 27 Master_Dept URLs; 27 live inspected URLs; 27 nearby doctor/team URLs; 1 direct staff/doctors URLs
- carmel: מרכז רפואי כרמל; rows=25; URLs=22; nearby=22; mode=pilot only; reason=known adapter carmel; 22 Master_Dept URLs; 22 live inspected URLs; 22 nearby doctor/team URLs; 1 direct staff/doctors URLs
- kaplan: מרכז רפואי קפלן; rows=25; URLs=22; nearby=22; mode=pilot only; reason=known adapter kaplan; 22 Master_Dept URLs; 22 live inspected URLs; 22 nearby doctor/team URLs
- rabin: ביה"ח בילינסון מרכז רפואי רבין / מרכז רפואי רבין / ביה"ח השרון מרכז רפואי רבין; rows=60; URLs=11; nearby=11; mode=pilot only; reason=known adapter rabin; 11 Master_Dept URLs; 11 live inspected URLs; 11 nearby doctor/team URLs

## Wave 2 Results
- emek: readiness=needsCalibration; reviewed=13; productionReady=7; sourceUrlMatch=11; reviewNeeded=2; blocker=Duplicate profile URLs remain in pilot output.
- carmel: readiness=needsCalibration; reviewed=630; productionReady=629; sourceUrlMatch=0; reviewNeeded=630; blocker=Duplicate profile URLs remain in pilot output.
- kaplan: readiness=needsHumanReview; reviewed=17; productionReady=6; sourceUrlMatch=1; reviewNeeded=16; blocker=Profile URL coverage is below 50%.
- rabin: readiness=safeForFullBatch; reviewed=37; productionReady=37; sourceUrlMatch=0; reviewNeeded=37; blocker=none

## Soroka
- Improved pilot available; full Soroka batch is not marked safe.