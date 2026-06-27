import { normalizeDepartmentNameSubDepartment } from "@/lib/department-normalization";

export const RABIN_MEDICAL_CENTER = "מרכז רפואי רבין";
export const RABIN_BEILINSON = `ביה"ח בילינסון מרכז רפואי רבין`;
export const RABIN_HASHARON = `ביה"ח השרון מרכז רפואי רבין`;
export const RABIN_GEHA = `מרכז לבה"נ גהה`;
export const RABIN_SCHNEIDER = "מרכז שניידר לילדים";

const RABIN_SPECIFIC_HOSPITALS = new Set([
  RABIN_BEILINSON,
  RABIN_HASHARON,
  RABIN_GEHA,
  RABIN_SCHNEIDER
]);

function cleanHebrewText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[“”״"]/g, '"')
    .replace(/[׳’‘`]/g, "'")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function compactHebrewText(value: string | null | undefined) {
  return cleanHebrewText(value)
    .replace(/["'.,:;()־-]/g, "")
    .replace(/\s+/g, "");
}

export function normalizeEffectiveHospitalText(value: string | null | undefined) {
  return cleanHebrewText(value);
}

type DepartmentEffectiveHospitalInput = {
  name?: string | null;
  subDepartment?: string | null;
  importStableKey?: string | null;
  residentsCount?: number | null;
  metrics?: Array<{
    metricKey?: string | null;
    label?: string | null;
    rawValue?: string | null;
    value?: number | null;
  }>;
  institution?: {
    name?: string | null;
  } | null;
  specialty?: {
    name?: string | null;
  } | null;
};

export function canonicalRabinHospitalName(value: string | null | undefined) {
  const compact = compactHebrewText(value);
  if (!compact) return null;

  if (compact.includes("בילינסון")) return RABIN_BEILINSON;
  if (compact.includes("שניידר")) return RABIN_SCHNEIDER;
  if (compact.includes("גהה")) return RABIN_GEHA;
  if (compact.includes("השרון")) return RABIN_HASHARON;
  if (compact.includes("רבין")) return RABIN_MEDICAL_CENTER;

  return null;
}

function containsRabin(value: string | null | undefined) {
  return compactHebrewText(value).includes("רבין");
}

function containsBeilinson(value: string | null | undefined) {
  return compactHebrewText(value).includes("בילינסון");
}

function containsSchneider(value: string | null | undefined) {
  return compactHebrewText(value).includes("שניידר");
}

function containsGeha(value: string | null | undefined) {
  return compactHebrewText(value).includes("גהה");
}

function containsHasharon(value: string | null | undefined) {
  return compactHebrewText(value).includes("השרון");
}

export function resolveEffectiveHospitalName(
  originalHospitalName: string | null | undefined,
  subDepartmentValue?: string | null
) {
  const originalName = normalizeEffectiveHospitalText(originalHospitalName);
  const rabinOriginalName = canonicalRabinHospitalName(originalName);
  const hospitalName = rabinOriginalName ?? originalName;

  if (!hospitalName) return originalName;

  if (RABIN_SPECIFIC_HOSPITALS.has(hospitalName) && containsRabin(subDepartmentValue)) {
    return RABIN_MEDICAL_CENTER;
  }

  if (hospitalName === RABIN_MEDICAL_CENTER) {
    if (containsBeilinson(subDepartmentValue)) return RABIN_BEILINSON;
    if (containsSchneider(subDepartmentValue)) return RABIN_SCHNEIDER;
    if (containsGeha(subDepartmentValue)) return RABIN_GEHA;
    if (containsHasharon(subDepartmentValue)) return RABIN_HASHARON;
  }

  return hospitalName;
}

export function resolveEffectiveHospitalAssignment(
  originalHospitalName: string | null | undefined,
  subDepartmentValue?: string | null
) {
  const originalHospitalNameNormalized = normalizeEffectiveHospitalText(originalHospitalName);
  const canonicalOriginalHospitalName =
    canonicalRabinHospitalName(originalHospitalNameNormalized) ?? originalHospitalNameNormalized;
  const effectiveHospitalName = resolveEffectiveHospitalName(
    originalHospitalNameNormalized,
    subDepartmentValue
  );
  const isRabinRelated = Boolean(canonicalRabinHospitalName(originalHospitalNameNormalized));
  const isReassigned =
    isRabinRelated &&
    canonicalOriginalHospitalName !== effectiveHospitalName;

  return {
    originalHospitalName: originalHospitalNameNormalized,
    canonicalOriginalHospitalName,
    effectiveHospitalName,
    subDepartment: normalizeEffectiveHospitalText(subDepartmentValue),
    isRabinRelated,
    isReassigned,
    countsAsPhysicalDepartment: !isReassigned
  };
}

export function effectiveHospitalFilterId(hospitalName: string) {
  return `effective:${normalizeEffectiveHospitalText(hospitalName)}`;
}

function subDepartmentFromMetrics(metrics: DepartmentEffectiveHospitalInput["metrics"]) {
  const metric = metrics?.find((item) => {
    const key = normalizeEffectiveHospitalText(item.metricKey);
    const label = normalizeEffectiveHospitalText(item.label);

    return key === "תת מחלקה" || key === "subDepartment" || key === "sub_department" || label === "תת מחלקה";
  });

  return metric?.rawValue ?? (metric?.value !== null && metric?.value !== undefined ? String(metric.value) : null);
}

function importedResidentsCount(department: DepartmentEffectiveHospitalInput) {
  const metric = department.metrics?.find((item) =>
    ["מספר_מתמחים", "residentsCount", "activeResidentsCount"].includes(item.metricKey ?? "")
  );

  return department.residentsCount ?? metric?.value ?? null;
}

function legacyRabinSubDepartmentOverride(department: DepartmentEffectiveHospitalInput) {
  const originalHospital = canonicalRabinHospitalName(department.institution?.name);
  if (originalHospital !== RABIN_MEDICAL_CENTER) return null;

  const specialtyName = compactHebrewText(department.specialty?.name);
  const departmentName = compactHebrewText(department.name);
  const residentsCount = importedResidentsCount(department);

  if (
    specialtyName === compactHebrewText("רפואה פנימית") &&
    departmentName === specialtyName &&
    residentsCount === 3
  ) {
    return "בילינסון";
  }

  return null;
}

export function getDepartmentEffectiveHospitalSubDepartment(department: DepartmentEffectiveHospitalInput) {
  return (
    department.subDepartment ??
    subDepartmentFromMetrics(department.metrics) ??
    legacyRabinSubDepartmentOverride(department) ??
    (department.name && department.specialty?.name
      ? normalizeDepartmentNameSubDepartment(department.name, department.specialty.name)
      : null)
  );
}

export function getEffectiveHospitalNameForDepartment(department: DepartmentEffectiveHospitalInput) {
  const subDepartment = getDepartmentEffectiveHospitalSubDepartment(department);
  return resolveEffectiveHospitalName(department.institution?.name, subDepartment);
}

export function getEffectiveHospitalAssignmentForDepartment(department: DepartmentEffectiveHospitalInput) {
  const subDepartment = getDepartmentEffectiveHospitalSubDepartment(department);
  return resolveEffectiveHospitalAssignment(department.institution?.name, subDepartment);
}
