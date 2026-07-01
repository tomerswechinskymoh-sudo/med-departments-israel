import { NextResponse } from "next/server";
import { formatDateInput, getAvailabilitySummary, getElectiveDepartmentBySlug, isStudentElectivesPreviewEnabled } from "@/lib/student-electives";

export async function GET(_request: Request, { params }: { params: Promise<{ departmentSlug: string }> }) {
  if (!isStudentElectivesPreviewEnabled()) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const { departmentSlug } = await params;
  const department = await getElectiveDepartmentBySlug(departmentSlug);

  if (!department) {
    return NextResponse.json({ error: "מחלקת אלקטיב לא נמצאה." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    department: {
      id: department.id,
      slug: department.slug,
      name: department.name,
      description: department.about || department.shortSummary,
      hospital: department.institution.name,
      city: department.institution.city,
      region: department.institution.region,
      specialty: department.specialty.name,
      settings: department.electiveSettings,
      availabilitySummary: getAvailabilitySummary(department),
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
