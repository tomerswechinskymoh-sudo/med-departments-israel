import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isStudentElectivesPreviewEnabled } from "@/lib/student-electives";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!isStudentElectivesPreviewEnabled()) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי לצפות בבקשות." }, { status: 401 });
  }

  const applications = await prisma.electiveApplication.findMany({
    where: {
      applicantUserId: session.userId
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
