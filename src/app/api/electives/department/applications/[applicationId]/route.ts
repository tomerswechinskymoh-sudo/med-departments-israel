import { NextResponse } from "next/server";
import { requireElectiveDepartmentApiSession } from "@/lib/elective-department-auth";
import { getRepresentativeApplication } from "@/lib/elective-representative-applications";

export async function GET(_request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const auth = await requireElectiveDepartmentApiSession();

  if (auth.status === "disabled") {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (auth.status === "unauthorized") {
    return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
  }

  const application = await getRepresentativeApplication({
    session: auth.session,
    applicationId: (await params).applicationId
  });

  if (!application) {
    return NextResponse.json({ error: "המועמדות לא נמצאה." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, application });
}
