import { NextResponse } from "next/server";
import { requireElectiveDepartmentApiSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireElectiveDepartmentApiSession();

  if (auth.status === "disabled") {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (auth.status === "unauthorized") {
    return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
  }

  const departmentIds = auth.session.assignedDepartments.map((department) => department.id);
  const applications = await prisma.electiveApplication.findMany({
    where: { departmentId: { in: departmentIds } },
    include: {
      department: {
        select: {
          name: true,
          institution: { select: { name: true } },
          specialty: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ ok: true, applications });
}
