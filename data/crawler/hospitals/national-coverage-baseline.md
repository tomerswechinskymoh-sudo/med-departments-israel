# National Crawler Coverage Baseline

Generated: 2026-06-22T14:13:30.678Z

## Totals
- workingDoctorRosterTotal: 26
- departmentMappedRoster: 15
- outputUsabilityHospitalRosterOnly: 11
- outputUsabilityDepartmentMappedRoster: 15
- outputUsabilityNotUsableYet: 35
- blocked: 35
- deferred: 1
- remainingUnattempted: 2
- safeForFullBatch: 5
- needsCalibration: 54
- needsAdapter: 12
- needsManualSeedUrl: 1

## Institution Types
- acuteHospital: 28
- psychiatricHospital: 11
- healthFund: 5
- privateNetwork: 3
- geriatricHospital: 11
- rehabilitationHospital: 1
- unknown: 1

## Usable Hospital Rosters
- hadassah: ביה"ח הדסה הר הצופים (undefined)
- rabin: ביה"ח השרון מרכז רפואי רבין (undefined)
- carmel: מרכז רפואי כרמל (undefined)
- ichilov: מרכז רפואי ת"א סוראסקי (undefined)
- geha: geha (undefined)
- hospital-fa8413a9cd: hospital-fa8413a9cd (undefined)
- jerusalem-mental-health-kfar-shaul-eitanim: jerusalem-mental-health-kfar-shaul-eitanim (undefined)
- maale-hacarmel: maale-hacarmel (undefined)
- shalvata: shalvata (undefined)
- soroka: Soroka Medical Center (undefined)
- yoseftal: yoseftal (undefined)

## Usable Department-Mapped Rosters
- laniado: ביה"ח לניאדו (undefined)
- maayanei-hayeshua: ביה"ח מעיני הישועה (undefined)
- galilee: המרכז הרפואי לגליל (undefined)
- emek: מרכז רפואי העמק (undefined)
- shamir: מרכז רפואי יצחק שמיר (undefined)
- meir: מרכז רפואי מאיר (undefined)
- kaplan: מרכז רפואי קפלן (undefined)
- barzilai: barzilai (undefined)
- hillel-yaffe: hillel-yaffe (undefined)
- holy-family: holy-family (undefined)
- leumit-health-fund: leumit-health-fund (undefined)
- nazareth-scottish: nazareth-scottish (undefined)
- poria: poria (undefined)
- saint-vincent: saint-vincent (undefined)
- schneider: schneider (undefined)

## High Priority Blockers
- shaare-zedek: shaare-zedek | needsManualSeedUrl | Find official public doctors/team/department seed URL before retry.
- barzilai: barzilai | other | Review source URL evidence and choose narrow adapter.
- wolfson: מרכז רפואי וולפסון | unknown | Review source URL evidence and choose narrow adapter.
- rambam: rambam | noPublicRosterFound | Find official public doctors/team/department seed URL before retry.
- bnei-zion: bnei-zion | siteBlocked | Manual/approved assisted capture or official alternate URL; do not blind retry automated fetch.
- ziv: ziv | siteBlocked | Manual/approved assisted capture or official alternate URL; do not blind retry automated fetch.

## Deferred Hard Cases
- sheba: hard JS/API/502 case; deferred by guardrail
- soroka: doctor index + pilot exist; full batch not safe yet
