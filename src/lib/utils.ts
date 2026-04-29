import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) {
    return "טרם עודכן";
  }

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0590-\u05FF]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function average(numbers: number[]) {
  if (numbers.length === 0) {
    return 0;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function normalizeHebrewDepartmentText(value: string) {
  return value
    .trim()
    .replace(/[׳’`]/g, "'")
    .replace(/\s+/g, " ");
}

function specialtyAliases(specialtyName: string) {
  const aliases = new Set<string>();
  const normalizedSpecialty = normalizeHebrewDepartmentText(specialtyName);
  const words = normalizedSpecialty.split(" ").filter(Boolean);

  aliases.add(normalizedSpecialty);

  if (words.length > 1) {
    aliases.add(words[words.length - 1]);
  }

  if (normalizedSpecialty.includes("גינקולוגיה")) {
    aliases.add("נשים");
  }

  if (normalizedSpecialty.includes("ילדים")) {
    aliases.add("ילדים");
  }

  if (normalizedSpecialty.includes("פנימית")) {
    aliases.add("פנימית");
  }

  if (normalizedSpecialty.includes("כירורגיה כללית")) {
    aliases.add("כללית");
  }

  return Array.from(aliases).sort((left, right) => right.length - left.length);
}

function normalizeSubDepartmentIdentifier(value: string) {
  return normalizeHebrewDepartmentText(value.replace(/^מחלקה\s+/, "")).replace(/'/g, "׳");
}

export function formatDepartmentDisplayName(departmentName: string, specialtyName: string) {
  const normalizedDepartment = normalizeHebrewDepartmentText(departmentName);
  const normalizedSpecialty = normalizeHebrewDepartmentText(specialtyName);

  if (!normalizedDepartment || normalizedDepartment === normalizedSpecialty) {
    return specialtyName;
  }

  if (normalizedDepartment.includes(normalizedSpecialty)) {
    return departmentName;
  }

  const standaloneIdentifierPattern = /^(?:מחלקה\s+)?[א-ת](?:'|׳)?$/;

  if (standaloneIdentifierPattern.test(normalizedDepartment)) {
    return `${specialtyName} ${normalizeSubDepartmentIdentifier(normalizedDepartment)}`;
  }

  for (const alias of specialtyAliases(specialtyName)) {
    if (normalizedDepartment === alias) {
      return specialtyName;
    }

    if (normalizedDepartment.startsWith(`${alias} `)) {
      const suffix = normalizeSubDepartmentIdentifier(normalizedDepartment.slice(alias.length).trim());
      return suffix ? `${specialtyName} ${suffix}` : specialtyName;
    }
  }

  return departmentName;
}

export function getDepartmentHref(department: { slug: string; id?: string | null }) {
  const basePath = `/departments/${encodeURIComponent(department.slug)}`;

  if (!department.id) {
    return basePath;
  }

  return `${basePath}?departmentId=${encodeURIComponent(department.id)}`;
}

export function buildDepartmentHref(slug: string) {
  return getDepartmentHref({ slug });
}
