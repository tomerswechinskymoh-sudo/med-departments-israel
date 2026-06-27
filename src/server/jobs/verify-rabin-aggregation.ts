import { duplicateAwareArrayMetricContributionAverage } from "@/lib/array-metric-aggregation";
import {
  RABIN_BEILINSON,
  RABIN_MEDICAL_CENTER,
  resolveEffectiveHospitalAssignment
} from "@/lib/effective-hospital";

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

const bilinsonAverage = duplicateAwareArrayMetricContributionAverage(
  [
    { value: 69, countsAsPhysicalDepartment: true },
    { value: 69, countsAsPhysicalDepartment: true },
    { value: 69, countsAsPhysicalDepartment: true },
    { value: 69, countsAsPhysicalDepartment: true },
    { value: 69, countsAsPhysicalDepartment: true },
    { value: 3, countsAsPhysicalDepartment: false }
  ],
  5
);
assertEqual("Bilinson internal medicine contribution average", bilinsonAverage, 14.4);

const rabinToBilinson = resolveEffectiveHospitalAssignment(RABIN_MEDICAL_CENTER, "בילינסון");
assertEqual("Rabin row effective hospital", rabinToBilinson.effectiveHospitalName, RABIN_BEILINSON);
assertEqual("Rabin row physical count flag", rabinToBilinson.countsAsPhysicalDepartment, false);

const bilinsonToRabin = resolveEffectiveHospitalAssignment(RABIN_BEILINSON, "רבין");
assertEqual("Beilinson row effective hospital", bilinsonToRabin.effectiveHospitalName, RABIN_MEDICAL_CENTER);
assertEqual("Beilinson row physical count flag", bilinsonToRabin.countsAsPhysicalDepartment, false);

const nonRabin = resolveEffectiveHospitalAssignment("מרכז רפואי שיבא", "בילינסון");
assertEqual("Non-Rabin effective hospital", nonRabin.effectiveHospitalName, "מרכז רפואי שיבא");
assertEqual("Non-Rabin physical count flag", nonRabin.countsAsPhysicalDepartment, true);

console.log(
  JSON.stringify({
    ok: true,
    bilinsonInternalMedicineAverage: bilinsonAverage,
    cases: 4
  })
);
