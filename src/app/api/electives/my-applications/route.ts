import { NextResponse } from "next/server";
import { getStudentElectivesAccess } from "@/lib/student-electives";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await getStudentElectivesAccess();

  if (!access.ok) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const applications = await prisma.electiveApplication.findMany({
    where: {
      applicantUserId: access.session.userId
    },
    include: {
      department: {
        select: {
          slug: true,
          name: true,
          institution: { select: { name: true, city: true } },
          specialty: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    ok: true,
    applications
  });
}
