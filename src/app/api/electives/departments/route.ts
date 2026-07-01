import { NextResponse } from "next/server";
import { getAvailabilitySummary, isStudentElectivesPreviewEnabled, listElectiveDepartments } from "@/lib/student-electives";

export async function GET(request: Request) {
  if (!isStudentElectivesPreviewEnabled()) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const url = new URL(request.url);
  const departments = await listElectiveDepartments({
    search: url.searchParams.get("search") ?? undefined,
    specialty: url.searchParams.get("specialty") ?? undefined,
    region: url.searchParams.get("region") ?? undefined
  });

  return NextResponse.json({
    ok: true,
    departments: departments.map((department) => ({
      id: department.id,
      slug: department.slug,
      name: department.name,
      hospital: department.institution.name,
      city: department.institution.city,
      region: department.institution.region,
      specialty: department.specialty.name,
      maxStudentsAtOnce: department.electiveSettings?.maxStudentsAtOnce ?? null,
      availabilityMode: department.electiveSettings?.availabilityMode ?? null,
      availabilitySummary: getAvailabilitySummary(department)
    }))
  });
}
