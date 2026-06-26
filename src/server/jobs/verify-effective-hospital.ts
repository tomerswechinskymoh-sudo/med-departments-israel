import {
  RABIN_BEILINSON,
  RABIN_GEHA,
  RABIN_HASHARON,
  RABIN_MEDICAL_CENTER,
  RABIN_SCHNEIDER,
  resolveEffectiveHospitalName
} from "@/lib/effective-hospital";

const cases = [
  {
    name: "Beilinson row unified under Rabin",
    original: RABIN_BEILINSON,
    subDepartment: "רבין",
    expected: RABIN_MEDICAL_CENTER
  },
  {
    name: "Hasharon row unified under Rabin",
    original: RABIN_HASHARON,
    subDepartment: "רבין",
    expected: RABIN_MEDICAL_CENTER
  },
  {
    name: "Geha row unified under Rabin",
    original: RABIN_GEHA,
    subDepartment: "רבין",
    expected: RABIN_MEDICAL_CENTER
  },
  {
    name: "Schneider row unified under Rabin",
    original: RABIN_SCHNEIDER,
    subDepartment: "רבין",
    expected: RABIN_MEDICAL_CENTER
  },
  {
    name: "Rabin row assigned to Beilinson",
    original: RABIN_MEDICAL_CENTER,
    subDepartment: "בילינסון",
    expected: RABIN_BEILINSON
  },
  {
    name: "Rabin row assigned to Schneider",
    original: RABIN_MEDICAL_CENTER,
    subDepartment: "שניידר",
    expected: RABIN_SCHNEIDER
  },
  {
    name: "Rabin row assigned to Geha",
    original: RABIN_MEDICAL_CENTER,
    subDepartment: "גהה",
    expected: RABIN_GEHA
  },
  {
    name: "Rabin row assigned to Hasharon",
    original: RABIN_MEDICAL_CENTER,
    subDepartment: "השרון",
    expected: RABIN_HASHARON
  },
  {
    name: "Rabin row without override",
    original: RABIN_MEDICAL_CENTER,
    subDepartment: "",
    expected: RABIN_MEDICAL_CENTER
  },
  {
    name: "Non-Rabin hospital unchanged",
    original: "מרכז רפואי שיבא",
    subDepartment: "רבין",
    expected: "מרכז רפואי שיבא"
  },
  {
    name: "Normalized quote and invisible chars",
    original: "ביה״ח   בילינסון\u200f מרכז רפואי רבין",
    subDepartment: "  רבין  ",
    expected: RABIN_MEDICAL_CENTER
  }
];

const failures = cases
  .map((testCase) => ({
    ...testCase,
    actual: resolveEffectiveHospitalName(testCase.original, testCase.subDepartment)
  }))
  .filter((testCase) => testCase.actual !== testCase.expected);

if (failures.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        failures
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    cases: cases.length
  })
);
