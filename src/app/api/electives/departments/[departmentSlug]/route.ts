import { NextResponse } from "next/server";
import {
  formatDateInput,
  getAvailabilityModeLabel,
  getAvailabilitySummary,
  getElectiveDepartmentAvailabilityMatch,
  getElectiveDepartmentRegion,
  getElectiveDepartmentBySlug,
  parseDateOnly,
  getStudentElectivesAccess
} from "@/lib/student-electives";

export async function GET(request: Request, { params }: { params: Promise<{ departmentSlug: string }> }) {
  const access = await getStudentElectivesAccess();

  if (!access.ok) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const { departmentSlug } = await params;
  const department = await getElectiveDepartmentBySlug(departmentSlug);

  if (!department) {
    return NextResponse.json({ error: "מחלקת אלקטיב לא נמצאה." }, { status: 404 });
  }

  const url = new URL(request.url);
  const requestedStartDate = parseDateOnly(url.searchParams.get("start") ?? "");
  const requestedEndDate = parseDateOnly(url.searchParams.get("end") ?? "");
  const dateMatch = requestedStartDate && requestedEndDate
    ? await getElectiveDepartmentAvailabilityMatch(department, requestedStartDate, requestedEndDate)
    : null;

  return NextResponse.json({
    ok: true,
    department: {
      id: department.id,
      slug: department.slug,
      name: department.name,
      description: department.about || department.shortSummary,
      hospital: department.institution.name,
      city: department.institution.city,
      region: getElectiveDepartmentRegion(department),
      specialty: department.specialty.name,
      settings: department.electiveSettings,
      availabilityModeLabel: getAvailabilityModeLabel(department.electiveSettings?.availabilityMode),
      availabilitySummary: getAvailabilitySummary(department),
      dateAvailability: {
        checked: Boolean(requestedStartDate && requestedEndDate),
        match: dateMatch,
        message: requestedStartDate && requestedEndDate ? null : "בחרו תאריך התחלה ותאריך סיום."
      },
      windows: department.electiveAvailabilityWindows.map((window) => ({
        id: window.id,
        status: window.status,
        startsAt: formatDateInput(window.startsAt),
        endsAt: formatDateInput(window.endsAt),
        capacityOverride: window.capacityOverride,
        reason: window.reason,
        note: window.note
      }))
    }
  });
}
