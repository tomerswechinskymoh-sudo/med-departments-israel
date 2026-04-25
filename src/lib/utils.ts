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
