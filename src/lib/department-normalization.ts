function cleanDepartmentPart(value: string | null | undefined) {
  return (value ?? "")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[׳’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDepartmentSubDepartment(value: string | null | undefined) {
  let normalized = cleanDepartmentPart(value)
    .replace(/[״"]/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/^בית\s*חולים-?\s*/i, "")
    .replace(/^מחלקה\s+/i, "")
    .trim();

  normalized = normalized
    .replace(/^בית\s*חולים-?\s*/i, "")
    .replace(/^מחלקה\s+/i, "")
    .trim();

  const singleHebrewLetter = normalized.match(/^([א-ת])'?$/);
  if (singleHebrewLetter) {
    return singleHebrewLetter[1];
  }

  return normalized;
}

export function departmentDisplayNameFromSubDepartment(specialtyName: string, subDepartment: string | null | undefined) {
  const specialty = cleanDepartmentPart(specialtyName);
  const sub = normalizeDepartmentSubDepartment(subDepartment);

  if (!sub) return specialty;
  if (sub.includes(specialty)) return sub;

  return `${specialty} ${sub}`.trim();
}

export function normalizeDepartmentNameSubDepartment(departmentName: string, specialtyName: string) {
  const department = cleanDepartmentPart(departmentName);
  const specialty = cleanDepartmentPart(specialtyName);
  const specialtyTail = specialty.split(" ").filter(Boolean).at(-1) ?? "";
  const candidates = [specialty, specialtyTail].filter(Boolean);

  for (const candidate of candidates) {
    if (department === candidate) return "";
    if (department.startsWith(`${candidate} `)) {
      return normalizeDepartmentSubDepartment(department.slice(candidate.length).trim());
    }
  }

  return normalizeDepartmentSubDepartment(department);
}
