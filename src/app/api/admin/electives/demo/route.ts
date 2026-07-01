import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";

type DemoAction = "seed" | "resetPassword";

function makeTemporaryPassword() {
  return `El-${randomBytes(9).toString("base64url")}-QA1`;
}

function toDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(9, 0, 0, 0);
  return date;
}

async function resolveDepartment(departmentId: unknown) {
  if (typeof departmentId === "string" && departmentId.trim()) {
    return prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } }
      }
    });
  }

  return prisma.department.findFirst({
    select: {
      id: true,
      name: true,
      institution: { select: { name: true } },
      specialty: { select: { name: true } }
    },
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }]
  });
}

async function upsertDemoApplication({
  departmentId,
  applicantEmail,
  applicantName,
  status,
  startOffset,
  endOffset
}: {
  departmentId: string;
  applicantEmail: string;
  applicantName: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED";
  startOffset: number;
  endOffset: number;
}) {
  const existing = await prisma.electiveApplication.findFirst({
    where: {
      departmentId,
      applicantEmail
    },
    select: { id: true }
  });
  const data = {
    departmentId,
    applicantName,
    applicantEmail,
    applicantPhone: "050-0000000",
    medicalSchool: "פקולטה לדוגמה",
    requestedStartDate: toDate(startOffset),
    requestedEndDate: toDate(endOffset),
    status,
    studentNotes: "נתון דמו פנימי לבדיקת ניהול אלקטיבים.",
    adminNotes: "QA demo"
  };

  if (existing) {
    await prisma.electiveApplication.update({
      where: { id: existing.id },
      data
    });
    return "updated";
  }

  await prisma.electiveApplication.create({ data });
  return "created";
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: DemoAction; departmentId?: string } | null;
  const action = body?.action;

  if (action !== "seed" && action !== "resetPassword") {
    return NextResponse.json({ error: "פעולת דמו לא תקינה." }, { status: 400 });
  }

  const department = await resolveDepartment(body?.departmentId);

  if (!department) {
    return NextResponse.json({ error: "לא נמצאה מחלקה לנתוני הדמו." }, { status: 404 });
  }

  const temporaryPassword = makeTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const username = `elective-demo-${department.id.slice(-8)}`;
  const account = await prisma.electiveDepartmentAccount.upsert({
    where: { departmentId: department.id },
    create: {
      departmentId: department.id,
      username,
      passwordHash,
      isActive: true,
      createdByAdminId: session.userId
    },
    update: {
      username,
      passwordHash,
      isActive: true
    }
  });

  const summary: Record<string, number | string | boolean | null> = {
    department: `${department.institution.name} · ${department.specialty.name} · ${department.name}`,
    accountActive: account.isActive
  };

  if (action === "seed") {
    await prisma.electiveDepartmentSettings.upsert({
      where: { departmentId: department.id },
      create: {
        departmentId: department.id,
        maxStudentsAtOnce: 2,
        availabilityMode: "OPEN_BY_DEFAULT",
        minDurationDays: 14,
        maxDurationDays: 42,
        allowApplications: false,
        contactEmail: "elective-demo@example.test",
        contactPhone: "03-0000000",
        instructions: "הגדרת דמו פנימית לבדיקת זמינות אלקטיבים.",
        notes: "הערת דמו למחלקה.",
        adminNotes: "QA demo"
      },
      update: {
        maxStudentsAtOnce: 2,
        availabilityMode: "OPEN_BY_DEFAULT",
        minDurationDays: 14,
        maxDurationDays: 42,
        allowApplications: false,
        contactEmail: "elective-demo@example.test",
        contactPhone: "03-0000000",
        instructions: "הגדרת דמו פנימית לבדיקת זמינות אלקטיבים.",
        notes: "הערת דמו למחלקה.",
        adminNotes: "QA demo"
      }
    });

    const existingWindowMarkers = await prisma.electiveAvailabilityWindow.findMany({
      where: {
        departmentId: department.id,
        note: { in: ["QA demo open window", "QA demo closed window"] }
      },
      select: { note: true }
    });
    const existingNotes = new Set(existingWindowMarkers.map((window) => window.note));
    const windowsToCreate = [
      {
        departmentId: department.id,
        status: "OPEN" as const,
        startsAt: toDate(14),
        endsAt: toDate(28),
        capacityOverride: 2,
        reason: "חלון פתוח לבדיקת QA",
        note: "QA demo open window"
      },
      {
        departmentId: department.id,
        status: "CLOSED" as const,
        startsAt: toDate(45),
        endsAt: toDate(52),
        capacityOverride: null,
        reason: "חלון סגור לבדיקת QA",
        note: "QA demo closed window"
      }
    ].filter((window) => !existingNotes.has(window.note));

    if (windowsToCreate.length > 0) {
      await prisma.electiveAvailabilityWindow.createMany({
        data: windowsToCreate
      });
    }

    const applicationResults = await Promise.all([
      upsertDemoApplication({
        departmentId: department.id,
        applicantEmail: "elective-demo-submitted@example.test",
        applicantName: "סטודנט/ית דמו - הוגש",
        status: "SUBMITTED",
        startOffset: 21,
        endOffset: 35
      }),
      upsertDemoApplication({
        departmentId: department.id,
        applicantEmail: "elective-demo-review@example.test",
        applicantName: "סטודנט/ית דמו - בבדיקה",
        status: "UNDER_REVIEW",
        startOffset: 42,
        endOffset: 56
      }),
      upsertDemoApplication({
        departmentId: department.id,
        applicantEmail: "elective-demo-accepted@example.test",
        applicantName: "סטודנט/ית דמו - אושר",
        status: "ACCEPTED",
        startOffset: 70,
        endOffset: 84
      })
    ]);

    summary.settings = "upserted";
    summary.windowsCreated = windowsToCreate.length;
    summary.applicationsTouched = applicationResults.length;
  }

  await createAuditLog({
    actorUserId: session.userId,
    action: action === "seed" ? "admin.electives_demo_seeded" : "admin.electives_demo_password_reset",
    entityType: "ElectiveDepartmentAccount",
    entityId: account.id,
    metadata: {
      departmentId: department.id,
      demo: true
    }
  });

  return NextResponse.json({
    message: action === "seed" ? "נתוני דמו לאלקטיבים נוצרו." : "סיסמה זמנית חדשה נוצרה.",
    temporaryPassword,
    summary
  });
}
