import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";

async function upsertProgram({
  fellowshipSpecialtyId,
  baseSpecialtyId,
  country,
  city,
  institution,
  departmentName,
  duration
}: {
  fellowshipSpecialtyId: string;
  baseSpecialtyId: string | null;
  country: string;
  city: string;
  institution: string;
  departmentName: string;
  duration: string;
}) {
  const existing = await prisma.fellowshipProgram.findFirst({
    where: {
      fellowshipSpecialtyId,
      country,
      institution,
      departmentName
    },
    select: { id: true }
  });
  const data = {
    fellowshipSpecialtyId,
    baseSpecialtyId,
    country,
    city,
    institution,
    departmentName,
    duration,
    requirements: "דרישות דמו פנימיות: קורות חיים, המלצות וניסיון מחקרי רלוונטי.",
    contactName: "QA contact",
    contactEmail: "fellowship-demo@example.test",
    websiteUrl: "https://example.test/fellowship-demo",
    notes: "QA demo",
    isPublished: false
  };

  if (existing) {
    return prisma.fellowshipProgram.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.fellowshipProgram.create({
    data
  });
}

async function upsertExperience({
  fellowshipSpecialtyId,
  fellowshipProgramId,
  physicianName,
  visibility,
  experienceText
}: {
  fellowshipSpecialtyId: string;
  fellowshipProgramId: string;
  physicianName: string;
  visibility: "ADMIN_ONLY" | "PUBLIC_ANONYMIZED" | "PUBLIC_IDENTIFIED";
  experienceText: string;
}) {
  const existing = await prisma.fellowshipIsraeliExperience.findFirst({
    where: {
      fellowshipProgramId,
      physicianName,
      visibility
    },
    select: { id: true }
  });
  const data = {
    fellowshipProgramId,
    fellowshipSpecialtyId,
    physicianName,
    roleTitle: "רופא/ה מומחה/ית",
    currentInstitution: "מוסד ישראלי לדוגמה",
    contactEmail: visibility === "ADMIN_ONLY" ? "private-fellowship-demo@example.test" : null,
    contactPhone: visibility === "ADMIN_ONLY" ? "050-0000000" : null,
    experienceText,
    visibility,
    notes: "QA demo",
    isPublished: false
  };

  if (existing) {
    return prisma.fellowshipIsraeliExperience.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.fellowshipIsraeliExperience.create({
    data
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;

  if (body?.action !== "seed") {
    return NextResponse.json({ error: "פעולת דמו לא תקינה." }, { status: 400 });
  }

  const [baseEnt, baseInternal] = await Promise.all([
    prisma.specialty.findFirst({ where: { name: { contains: "א.א" } }, select: { id: true } }),
    prisma.specialty.findFirst({ where: { name: { contains: "פנימית" } }, select: { id: true } })
  ]);

  const entSpecialty = await prisma.fellowshipSpecialty.upsert({
    where: { slug: "qa-ent-head-neck" },
    create: {
      slug: "qa-ent-head-neck",
      nameHe: "אא״ג - ראש וצוואר",
      nameEn: "ENT Head and Neck",
      baseSpecialtyId: baseEnt?.id ?? null,
      description: "תחום דמו פנימי לבדיקת מודול פלושיפים.",
      beforeContent: "לפני פלושיפ: דמו פנימי.",
      duringContent: "במהלך פלושיפ: דמו פנימי.",
      afterContent: "אחרי פלושיפ: דמו פנימי.",
      isPublished: false,
      createdByAdminId: session.userId
    },
    update: {
      nameHe: "אא״ג - ראש וצוואר",
      nameEn: "ENT Head and Neck",
      baseSpecialtyId: baseEnt?.id ?? null,
      description: "תחום דמו פנימי לבדיקת מודול פלושיפים.",
      beforeContent: "לפני פלושיפ: דמו פנימי.",
      duringContent: "במהלך פלושיפ: דמו פנימי.",
      afterContent: "אחרי פלושיפ: דמו פנימי.",
      isPublished: false
    }
  });
  const internalSpecialty = await prisma.fellowshipSpecialty.upsert({
    where: { slug: "qa-internal-research" },
    create: {
      slug: "qa-internal-research",
      nameHe: "רפואה פנימית - מחקר קליני",
      nameEn: "Internal Medicine Clinical Research",
      baseSpecialtyId: baseInternal?.id ?? null,
      description: "תחום דמו פנימי נוסף.",
      beforeContent: "לפני פלושיפ: הכנת CV ומכתבי המלצה.",
      duringContent: "במהלך פלושיפ: ניהול מחקר והשתלבות קלינית.",
      afterContent: "אחרי פלושיפ: חזרה לישראל והטמעת ידע.",
      isPublished: false,
      createdByAdminId: session.userId
    },
    update: {
      nameHe: "רפואה פנימית - מחקר קליני",
      nameEn: "Internal Medicine Clinical Research",
      baseSpecialtyId: baseInternal?.id ?? null,
      description: "תחום דמו פנימי נוסף.",
      beforeContent: "לפני פלושיפ: הכנת CV ומכתבי המלצה.",
      duringContent: "במהלך פלושיפ: ניהול מחקר והשתלבות קלינית.",
      afterContent: "אחרי פלושיפ: חזרה לישראל והטמעת ידע.",
      isPublished: false
    }
  });

  const [programOne, programTwo] = await Promise.all([
    upsertProgram({
      fellowshipSpecialtyId: entSpecialty.id,
      baseSpecialtyId: entSpecialty.baseSpecialtyId,
      country: "ארצות הברית",
      city: "New York",
      institution: "QA University Hospital",
      departmentName: "Head and Neck Surgery",
      duration: "12 חודשים"
    }),
    upsertProgram({
      fellowshipSpecialtyId: internalSpecialty.id,
      baseSpecialtyId: internalSpecialty.baseSpecialtyId,
      country: "קנדה",
      city: "Toronto",
      institution: "QA Academic Medical Centre",
      departmentName: "Clinical Research Unit",
      duration: "24 חודשים"
    })
  ]);

  await Promise.all([
    upsertExperience({
      fellowshipSpecialtyId: entSpecialty.id,
      fellowshipProgramId: programOne.id,
      physicianName: "רופא/ה דמו - אדמין בלבד",
      visibility: "ADMIN_ONLY",
      experienceText: "ניסיון דמו עם פרטי קשר פנימיים בלבד."
    }),
    upsertExperience({
      fellowshipSpecialtyId: entSpecialty.id,
      fellowshipProgramId: programOne.id,
      physicianName: "רופא/ה דמו - אנונימי",
      visibility: "PUBLIC_ANONYMIZED",
      experienceText: "ניסיון דמו שמוכן לפרסום אנונימי בעתיד."
    }),
    upsertExperience({
      fellowshipSpecialtyId: internalSpecialty.id,
      fellowshipProgramId: programTwo.id,
      physicianName: "רופא/ה דמו - מזוהה",
      visibility: "PUBLIC_IDENTIFIED",
      experienceText: "ניסיון דמו שמוכן לפרסום מזוהה בעתיד אם יאושר."
    })
  ]);

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.fellowships_demo_seeded",
    entityType: "FellowshipSpecialty",
    entityId: entSpecialty.id,
    metadata: {
      demo: true,
      fellowshipSpecialtyIds: [entSpecialty.id, internalSpecialty.id]
    }
  });

  return NextResponse.json({
    message: "נתוני דמו לפלושיפים נוצרו.",
    summary: {
      specialtiesTouched: 2,
      programsTouched: 2,
      visibilityModesCovered: "ADMIN_ONLY, PUBLIC_ANONYMIZED, PUBLIC_IDENTIFIED"
    }
  });
}
