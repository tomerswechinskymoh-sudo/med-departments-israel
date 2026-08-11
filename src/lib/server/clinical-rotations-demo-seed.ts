import {
  ClinicalRotationApplicationStatus,
  ClinicalRotationCancellationActorType,
  ClinicalRotationCancellationReasonCategory,
  ClinicalRotationCancellationStatus,
  ClinicalRotationCoreRuleEnforcementMode,
  ClinicalRotationCoreSpecialty,
  ClinicalRotationEligibilityImportStatus,
  ClinicalRotationGroupMemberStatus,
  ClinicalRotationGroupStatus,
  ClinicalRotationIdentityVerificationStatus,
  ClinicalRotationNotificationOutboxStatus,
  ClinicalRotationNotificationOutboxType,
  ClinicalRotationOfferingStatus,
  ClinicalRotationPaymentMethod,
  ClinicalRotationPaymentStatus,
  ClinicalRotationPriceUnit,
  ClinicalRotationSourceDeletionStatus,
  InstitutionType,
  RoleKey,
  VerificationStatus
} from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  CLINICAL_ROTATIONS_ID_KEY_VERSION,
  createClinicalRotationInviteToken,
  createClinicalRotationSyntheticDemoAnonymousKey,
  hashClinicalRotationInviteToken
} from "@/lib/clinical-rotations-privacy";
import { slugify } from "@/lib/utils";

const DEMO_EMAIL_DOMAIN = "clinical-rotations-demo.example.test";
const DEMO_PASSWORD = "ClinicalDemo!2026";
const DEMO_HOSPITAL_SLUG_PREFIX = "clinical-rotations-demo-hospital";
const DEMO_OFFERING_SLUG_PREFIX = "clinical-rotations-demo-offering";
const DEMO_SOURCE_LABEL = "DEMO - Clinical Rotations synthetic eligibility list";
const UNDECIDED_DEMO_APPLICATION_STATUSES: ClinicalRotationApplicationStatus[] = [
  ClinicalRotationApplicationStatus.SUBMITTED,
  ClinicalRotationApplicationStatus.WAITLISTED,
  ClinicalRotationApplicationStatus.CANCELLATION_REQUESTED
];

const demoUsers = {
  admin: "admin@clinical-rotations-demo.example.test",
  adminNoDocs: "admin-no-docs@clinical-rotations-demo.example.test",
  northCoordinator: "coordinator-north@clinical-rotations-demo.example.test",
  centerCoordinator: "coordinator-center@clinical-rotations-demo.example.test",
  southCoordinator: "coordinator-south@clinical-rotations-demo.example.test",
  studentOne: "student-one@clinical-rotations-demo.example.test",
  studentTwo: "student-two@clinical-rotations-demo.example.test",
  studentThree: "student-three@clinical-rotations-demo.example.test",
  studentFour: "student-four@clinical-rotations-demo.example.test",
  studentIneligible: "student-ineligible@clinical-rotations-demo.example.test",
  studentPending: "student-pending@clinical-rotations-demo.example.test"
};

const demoHospitals = [
  { key: "north", name: "בית חולים הדגמה צפון", slug: `${DEMO_HOSPITAL_SLUG_PREFIX}-north`, city: "עיר הדגמה צפון", region: "צפון" },
  { key: "center", name: "בית חולים הדגמה מרכז", slug: `${DEMO_HOSPITAL_SLUG_PREFIX}-center`, city: "עיר הדגמה מרכז", region: "מרכז" },
  { key: "south", name: "בית חולים הדגמה דרום", slug: `${DEMO_HOSPITAL_SLUG_PREFIX}-south`, city: "עיר הדגמה דרום", region: "דרום" }
] as const;

const specialtySeeds = [
  ["internal-medicine", "רפואה פנימית", ClinicalRotationCoreSpecialty.INTERNAL_MEDICINE],
  ["general-surgery", "כירורגיה כללית", ClinicalRotationCoreSpecialty.GENERAL_SURGERY],
  ["pediatrics", "ילדים", ClinicalRotationCoreSpecialty.PEDIATRICS],
  ["obgyn", "נשים ויולדות", ClinicalRotationCoreSpecialty.OBSTETRICS_GYNECOLOGY],
  ["anesthesia", "הרדמה", null],
  ["psychiatry", "פסיכיאטריה", null],
  ["emergency-medicine", "רפואה דחופה", null]
] as const;

export function assertClinicalRotationsDemoSeedAllowed() {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    throw new Error("Clinical Rotations demo seed is allowed only when NODE_ENV is development or test.");
  }

  if (process.env.ALLOW_CLINICAL_ROTATIONS_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_CLINICAL_ROTATIONS_DEMO_SEED=true before running the Clinical Rotations demo seed.");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the Clinical Rotations demo seed.");
  }

  const parsed = new URL(databaseUrl);
  const host = parsed.hostname.toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "postgres", "db", "host.docker.internal"]);
  if (!localHosts.has(host)) {
    throw new Error("Refusing to seed Clinical Rotations demo data: database host is not localhost/local Docker.");
  }

  if (host.includes("neon") || databaseUrl.toLowerCase().includes("neon.tech")) {
    throw new Error("Refusing to seed Clinical Rotations demo data into a Neon database.");
  }
}

function weeksFromNow(weeks: number, dayOffset = 0) {
  const date = new Date();
  date.setUTCHours(9, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + weeks * 7 + dayOffset);
  return date;
}

function addWeeks(start: Date, weeks: number) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + weeks * 7 - 1);
  end.setUTCHours(17, 0, 0, 0);
  return end;
}

async function ensureRoles() {
  await prisma.role.createMany({
    data: [
      { key: RoleKey.STUDENT, label: "סטודנט", description: "משתמש סטודנט" },
      { key: RoleKey.RESIDENT, label: "מתמחה", description: "משתמש מתמחה" },
      { key: RoleKey.REPRESENTATIVE, label: "נציג", description: "נציג בית חולים" },
      { key: RoleKey.ADMIN, label: "אדמין", description: "מנהל מערכת" }
    ],
    skipDuplicates: true
  });
}

async function upsertDemoUser(email: string, fullName: string, roleKey: RoleKey) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      fullName,
      passwordHash,
      roleKey,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      roleStatus: "DEMO_SYNTHETIC"
    },
    update: {
      fullName,
      passwordHash,
      roleKey,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      verificationStatus: VerificationStatus.VERIFIED,
      roleStatus: "DEMO_SYNTHETIC"
    }
  });
}

async function upsertDemoSpecialties() {
  const result = new Map<string, { id: string; name: string; core: ClinicalRotationCoreSpecialty | null }>();
  for (const [slug, name, core] of specialtySeeds) {
    const specialty = await prisma.specialty.upsert({
      where: { slug },
      create: {
        slug,
        name,
        description: "תחום רפואי המשמש להדגמת שוק הסבבים הקליניים.",
        dataSourceNotes: "Clinical Rotations local demo seed"
      },
      update: {}
    });
    result.set(slug, { id: specialty.id, name: specialty.name, core });
  }
  return result;
}

async function upsertDemoHospitalsAndDepartments(specialties: Map<string, { id: string; name: string; core: ClinicalRotationCoreSpecialty | null }>) {
  const hospitals = new Map<string, { id: string; slug: string; name: string; departments: Map<string, string> }>();

  for (const hospitalSeed of demoHospitals) {
    const hospital = await prisma.institution.upsert({
      where: { slug: hospitalSeed.slug },
      create: {
        name: hospitalSeed.name,
        slug: hospitalSeed.slug,
        type: InstitutionType.HOSPITAL,
        city: hospitalSeed.city,
        region: hospitalSeed.region,
        summary: "בית חולים סינתטי להדגמה מקומית בלבד."
      },
      update: {
        name: hospitalSeed.name,
        type: InstitutionType.HOSPITAL,
        city: hospitalSeed.city,
        region: hospitalSeed.region,
        summary: "בית חולים סינתטי להדגמה מקומית בלבד."
      }
    });

    const departments = new Map<string, string>();
    for (const [specialtySlug, specialty] of specialties) {
      const departmentSlug = `${hospital.slug}-${specialtySlug}`;
      const department = await prisma.department.upsert({
        where: { slug: departmentSlug },
        create: {
          institutionId: hospital.id,
          specialtyId: specialty.id,
          slug: departmentSlug,
          name: `מחלקת ${specialty.name} - הדגמה`,
          shortSummary: "מחלקה סינתטית להדגמת סבבים קליניים.",
          about: "נתוני המחלקה סינתטיים ונועדו לבדיקה מקומית בלבד.",
          practicalInfo: "אין להשתמש בנתונים אלה מול משתמשים אמיתיים.",
          dataSourceNotes: "Clinical Rotations local demo seed"
        },
        update: {
          specialtyId: specialty.id,
          name: `מחלקת ${specialty.name} - הדגמה`,
          shortSummary: "מחלקה סינתטית להדגמת סבבים קליניים.",
          about: "נתוני המחלקה סינתטיים ונועדו לבדיקה מקומית בלבד.",
          practicalInfo: "אין להשתמש בנתונים אלה מול משתמשים אמיתיים.",
          dataSourceNotes: "Clinical Rotations local demo seed"
        }
      });
      departments.set(specialtySlug, department.id);
    }

    hospitals.set(hospitalSeed.key, { id: hospital.id, slug: hospital.slug, name: hospital.name, departments });
  }

  return hospitals;
}

export async function resetClinicalRotationsDemoData() {
  assertClinicalRotationsDemoSeedAllowed();

  const demoEmails = Object.values(demoUsers);
  const demoUserIds = (await prisma.user.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true }
  })).map((user) => user.id);
  const demoHospitalIds = (await prisma.institution.findMany({
    where: { slug: { startsWith: DEMO_HOSPITAL_SLUG_PREFIX } },
    select: { id: true }
  })).map((hospital) => hospital.id);
  const demoOfferingIds = (await prisma.clinicalRotationOffering.findMany({
    where: {
      OR: [
        { slug: { startsWith: DEMO_OFFERING_SLUG_PREFIX } },
        { hospitalId: { in: demoHospitalIds } }
      ]
    },
    select: { id: true }
  })).map((offering) => offering.id);
  const demoApplicationIds = (await prisma.clinicalRotationApplication.findMany({
    where: {
      OR: [
        { studentUserId: { in: demoUserIds } },
        { hospitalId: { in: demoHospitalIds } },
        { offeringId: { in: demoOfferingIds } }
      ]
    },
    select: { id: true }
  })).map((application) => application.id);
  const demoGroupIds = (await prisma.clinicalRotationGroupApplication.findMany({
    where: {
      OR: [
        { creatorUserId: { in: demoUserIds } },
        { hospitalId: { in: demoHospitalIds } },
        { offeringId: { in: demoOfferingIds } }
      ]
    },
    select: { id: true }
  })).map((group) => group.id);
  const demoImportIds = (await prisma.clinicalRotationEligibilityImport.findMany({
    where: { sourceLabel: { startsWith: "DEMO -" } },
    select: { id: true }
  })).map((entry) => entry.id);

  await prisma.clinicalRotationAuditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: demoUserIds } },
        { hospitalId: { in: demoHospitalIds } },
        { offeringId: { in: demoOfferingIds } },
        { applicationId: { in: demoApplicationIds } },
        { groupId: { in: demoGroupIds } }
      ]
    }
  });
  await prisma.clinicalRotationNotificationOutbox.deleteMany({
    where: {
      OR: [
        { hospitalId: { in: demoHospitalIds } },
        { offeringId: { in: demoOfferingIds } },
        { applicationId: { in: demoApplicationIds } },
        { groupId: { in: demoGroupIds } }
      ]
    }
  });
  await prisma.clinicalRotationCancellation.deleteMany({
    where: {
      OR: [
        { applicationId: { in: demoApplicationIds } },
        { groupId: { in: demoGroupIds } },
        { hospitalId: { in: demoHospitalIds } }
      ]
    }
  });
  await prisma.clinicalRotationPayment.deleteMany({ where: { applicationId: { in: demoApplicationIds } } });
  await prisma.clinicalRotationGroupMember.deleteMany({
    where: { OR: [{ groupId: { in: demoGroupIds } }, { userId: { in: demoUserIds } }] }
  });
  await prisma.clinicalRotationApplication.deleteMany({ where: { id: { in: demoApplicationIds } } });
  await prisma.clinicalRotationGroupApplication.deleteMany({ where: { id: { in: demoGroupIds } } });
  await prisma.clinicalRotationOffering.deleteMany({ where: { id: { in: demoOfferingIds } } });
  await prisma.clinicalRotationBlackout.deleteMany({ where: { hospitalId: { in: demoHospitalIds } } });
  await prisma.clinicalRotationAvailabilityWindow.deleteMany({ where: { hospitalId: { in: demoHospitalIds } } });
  await prisma.clinicalRotationHospitalAccess.deleteMany({
    where: { OR: [{ userId: { in: demoUserIds } }, { hospitalId: { in: demoHospitalIds } }] }
  });
  await prisma.clinicalRotationAdminPermission.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.clinicalRotationStudentIdentity.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.clinicalRotationEligibilityEntry.deleteMany({ where: { importId: { in: demoImportIds } } });
  await prisma.clinicalRotationEligibilityImport.deleteMany({ where: { id: { in: demoImportIds } } });
  await prisma.department.deleteMany({ where: { institutionId: { in: demoHospitalIds } } });
  await prisma.institution.deleteMany({ where: { id: { in: demoHospitalIds } } });
  await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });

  return {
    deletedUsers: demoUserIds.length,
    deletedHospitals: demoHospitalIds.length,
    deletedOfferings: demoOfferingIds.length,
    deletedApplications: demoApplicationIds.length,
    deletedGroups: demoGroupIds.length
  };
}

export async function seedClinicalRotationsDemoData() {
  assertClinicalRotationsDemoSeedAllowed();
  await resetClinicalRotationsDemoData();
  await ensureRoles();

  const [admin, adminNoDocs, northCoordinator, centerCoordinator, southCoordinator, studentOne, studentTwo, studentThree, studentFour, studentIneligible, studentPending] =
    await Promise.all([
      upsertDemoUser(demoUsers.admin, "אדמין הדגמה מסמכים", RoleKey.ADMIN),
      upsertDemoUser(demoUsers.adminNoDocs, "אדמין הדגמה ללא מסמכים", RoleKey.ADMIN),
      upsertDemoUser(demoUsers.northCoordinator, "מתאמת הדגמה צפון", RoleKey.REPRESENTATIVE),
      upsertDemoUser(demoUsers.centerCoordinator, "מתאם הדגמה מרכז", RoleKey.REPRESENTATIVE),
      upsertDemoUser(demoUsers.southCoordinator, "מתאמת הדגמה דרום", RoleKey.REPRESENTATIVE),
      upsertDemoUser(demoUsers.studentOne, "סטודנט הדגמה אחד", RoleKey.STUDENT),
      upsertDemoUser(demoUsers.studentTwo, "סטודנטית הדגמה שתיים", RoleKey.STUDENT),
      upsertDemoUser(demoUsers.studentThree, "סטודנט הדגמה שלוש", RoleKey.STUDENT),
      upsertDemoUser(demoUsers.studentFour, "סטודנטית הדגמה ארבע", RoleKey.STUDENT),
      upsertDemoUser(demoUsers.studentIneligible, "סטודנט הדגמה לא זכאי", RoleKey.STUDENT),
      upsertDemoUser(demoUsers.studentPending, "סטודנטית הדגמה ממתינה", RoleKey.STUDENT)
    ]);

  await prisma.clinicalRotationAdminPermission.create({
    data: {
      userId: admin.id,
      key: "CAN_REVIEW_IDENTITY_DOCUMENTS",
      isActive: true,
      grantedByUserId: admin.id
    }
  });

  const specialties = await upsertDemoSpecialties();
  const hospitals = await upsertDemoHospitalsAndDepartments(specialties);
  const coordinatorAssignments = [
    [northCoordinator.id, hospitals.get("north")!.id],
    [centerCoordinator.id, hospitals.get("center")!.id],
    [southCoordinator.id, hospitals.get("south")!.id]
  ] as const;

  await prisma.clinicalRotationHospitalAccess.createMany({
    data: coordinatorAssignments.map(([userId, hospitalId]) => ({
      userId,
      hospitalId,
      isActive: true,
      activatedAt: new Date(),
      createdByAdminId: admin.id
    })),
    skipDuplicates: true
  });

  for (const hospital of hospitals.values()) {
    await prisma.clinicalRotationAvailabilityWindow.createMany({
      data: [
        { hospitalId: hospital.id, startsAt: weeksFromNow(2), endsAt: weeksFromNow(24), notes: "חלון הדגמה פתוח", createdByUserId: admin.id },
        { hospitalId: hospital.id, startsAt: weeksFromNow(28), endsAt: weeksFromNow(40), notes: "חלון הדגמה מאוחר", createdByUserId: admin.id }
      ]
    });
    await prisma.clinicalRotationBlackout.createMany({
      data: [
        { hospitalId: hospital.id, startsAt: weeksFromNow(8), endsAt: weeksFromNow(8, 3), reason: "סגירת מחלקה סינתטית", createdByUserId: admin.id }
      ]
    });
  }

  const offeringSeeds = [
    ["north", "internal-medicine", "סבב פנימית עם דיוני בוקר", 3, 4, 6, 2, 6, 750, ClinicalRotationPriceUnit.PER_WEEK, ClinicalRotationPaymentMethod.CASH_AT_ROTATION, ClinicalRotationOfferingStatus.PUBLISHED, false, true],
    ["north", "general-surgery", "כירורגיה כללית בחדרי ניתוח", 5, 3, 4, 1, 4, 2800, ClinicalRotationPriceUnit.TOTAL, ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, ClinicalRotationOfferingStatus.PUBLISHED, false, true],
    ["north", "pediatrics", "ילדים קהילה ואשפוז", 10, 4, 5, 2, 5, 650, ClinicalRotationPriceUnit.PER_WEEK, ClinicalRotationPaymentMethod.CASH_AT_ROTATION, ClinicalRotationOfferingStatus.PAUSED, false, false],
    ["center", "obgyn", "נשים ויולדות - חדר לידה", 4, 4, 3, 1, 3, 3200, ClinicalRotationPriceUnit.TOTAL, ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, ClinicalRotationOfferingStatus.PUBLISHED, false, true],
    ["center", "anesthesia", "הרדמה והתאוששות", 7, 2, 2, 1, 2, 950, ClinicalRotationPriceUnit.PER_WEEK, ClinicalRotationPaymentMethod.CASH_AT_ROTATION, ClinicalRotationOfferingStatus.DRAFT, false, false],
    ["center", "psychiatry", "פסיכיאטריה אשפוז יום", 12, 4, 4, 1, 4, 1200, ClinicalRotationPriceUnit.PER_WEEK, ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, ClinicalRotationOfferingStatus.CLOSED, false, false],
    ["south", "emergency-medicine", "רפואה דחופה במשמרות", 6, 3, 4, 2, 4, 1800, ClinicalRotationPriceUnit.TOTAL, ClinicalRotationPaymentMethod.CASH_AT_ROTATION, ClinicalRotationOfferingStatus.PUBLISHED, true, false],
    ["south", "internal-medicine", "פנימית דרום - תצוגה חסומה", 14, 4, 4, 1, 4, 500, ClinicalRotationPriceUnit.PER_WEEK, ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, ClinicalRotationOfferingStatus.PUBLISHED, false, false],
    ["south", "general-surgery", "כירורגיה דרום - בוטל", 18, 4, 3, 1, 3, 2100, ClinicalRotationPriceUnit.TOTAL, ClinicalRotationPaymentMethod.CASH_AT_ROTATION, ClinicalRotationOfferingStatus.CANCELLED, false, false],
    ["center", "pediatrics", "ילדים מרכז - קבוצות קטנות", 16, 3, 6, 2, 6, 700, ClinicalRotationPriceUnit.PER_WEEK, ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, ClinicalRotationOfferingStatus.PUBLISHED, false, true]
  ] as const;

  const offerings = new Map<string, { id: string; hospitalId: string; specialtyId: string; departmentId: string | null; startsAt: Date; endsAt: Date }>();
  for (const [index, seed] of offeringSeeds.entries()) {
    const [hospitalKey, specialtySlug, title, startsInWeeks, durationWeeks, maxCapacity, minDurationWeeks, maxDurationWeeks, priceAmount, priceUnit, paymentMethod, status, isPreviewOnly, groupEnabled] = seed;
    const hospital = hospitals.get(hospitalKey)!;
    const specialty = specialties.get(specialtySlug)!;
    const startsAt = weeksFromNow(startsInWeeks);
    const endsAt = addWeeks(startsAt, durationWeeks);
    const slug = `${DEMO_OFFERING_SLUG_PREFIX}-${index + 1}-${slugify(title)}`;
    const offering = await prisma.clinicalRotationOffering.create({
      data: {
        hospitalId: hospital.id,
        specialtyId: specialty.id,
        departmentId: hospital.departments.get(specialtySlug) ?? null,
        coreSpecialty: specialty.core,
        slug,
        displayName: title,
        startsAt,
        endsAt,
        minimumParticipants: index % 3 === 0 ? 2 : 1,
        maximumCapacity: maxCapacity,
        minDurationWeeks,
        maxDurationWeeks,
        priceAmount,
        priceCurrency: "ILS",
        priceUnit,
        paymentMethod,
        paymentLink: paymentMethod === ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK ? `https://payments.example.test/clinical-rotations-demo/${index + 1}` : null,
        status,
        publishedAt: status === ClinicalRotationOfferingStatus.PUBLISHED ? new Date() : null,
        pausedAt: status === ClinicalRotationOfferingStatus.PAUSED ? new Date() : null,
        closedAt: status === ClinicalRotationOfferingStatus.CLOSED ? new Date() : null,
        cancelledAt: status === ClinicalRotationOfferingStatus.CANCELLED ? new Date() : null,
        requirements: "נוכחות מלאה, חלוק, אישור דיקן וביטוח לפי הצורך. נתון סינתטי.",
        cancellationPolicy: "ביטול עד 14 יום לפני תחילת הסבב ללא עלות. נתון סינתטי.",
        workLanguage: index % 2 === 0 ? "עברית" : "עברית ואנגלית",
        departmentContactName: "צוות הדגמה",
        departmentContactEmail: `department-${index + 1}@${DEMO_EMAIL_DOMAIN}`,
        requiresDeanApproval: index % 2 === 0,
        requiresInsurance: true,
        groupRegistrationEnabled: groupEnabled,
        groupMinSize: groupEnabled ? 2 : null,
        groupMaxSize: groupEnabled ? Math.min(4, maxCapacity) : null,
        isPreviewOnly,
        applicationBlockedReason: isPreviewOnly ? "סבב הדגמה חסום להגשות." : null,
        studentInstructions: "יש להגיע עם תעודה מזהה אוניברסיטאית ואישור לימודים. נתוני הדגמה בלבד.",
        internalNotes: "רשומת הדגמה מקומית בלבד.",
        createdByUserId: admin.id,
        updatedByUserId: admin.id
      }
    });
    offerings.set(String(index + 1), { id: offering.id, hospitalId: offering.hospitalId, specialtyId: offering.specialtyId, departmentId: offering.departmentId, startsAt, endsAt });
  }

  const studentKeys = new Map<string, ReturnType<typeof createClinicalRotationSyntheticDemoAnonymousKey>>();
  for (const [key, user] of [
    ["student-one", studentOne],
    ["student-two", studentTwo],
    ["student-three", studentThree],
    ["student-four", studentFour],
    ["student-ineligible", studentIneligible],
    ["student-pending", studentPending]
  ] as const) {
    const syntheticKey = createClinicalRotationSyntheticDemoAnonymousKey(key);
    studentKeys.set(user.id, syntheticKey);
    await prisma.clinicalRotationStudentIdentity.create({
      data: {
        userId: user.id,
        studentAnonymousKey: syntheticKey.studentAnonymousKey,
        keyVersion: syntheticKey.keyVersion,
        status: user.id === studentPending.id
          ? ClinicalRotationIdentityVerificationStatus.PENDING_REVIEW
          : ClinicalRotationIdentityVerificationStatus.APPROVED,
        submittedAt: new Date(),
        decidedAt: user.id === studentPending.id ? null : new Date(),
        verifierUserId: user.id === studentPending.id ? null : admin.id,
        documentDeletedAt: user.id === studentPending.id ? null : new Date(),
        reviewerNote: "DEMO_SYNTHETIC_METADATA_ONLY"
      }
    });
  }

  const eligibleStudentIds = [studentOne.id, studentTwo.id, studentThree.id, studentFour.id];
  const eligibilityImport = await prisma.clinicalRotationEligibilityImport.create({
    data: {
      sourceLabel: DEMO_SOURCE_LABEL,
      status: ClinicalRotationEligibilityImportStatus.ACTIVE,
      keyVersion: CLINICAL_ROTATIONS_ID_KEY_VERSION,
      rowCount: eligibleStudentIds.length,
      acceptedRowCount: eligibleStudentIds.length,
      rejectedRowCount: 0,
      validationSummary: { source: "synthetic_demo", retainedRawIds: false },
      sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.NOT_STORED,
      activatedAt: new Date(),
      createdByUserId: admin.id,
      entries: {
        createMany: {
          data: eligibleStudentIds.map((studentId) => ({
            studentAnonymousKey: studentKeys.get(studentId)!.studentAnonymousKey,
            keyVersion: studentKeys.get(studentId)!.keyVersion
          }))
        }
      }
    }
  });

  for (const [coreSpecialty, mode, maxWeeks] of [
    [ClinicalRotationCoreSpecialty.INTERNAL_MEDICINE, ClinicalRotationCoreRuleEnforcementMode.WARN, 12],
    [ClinicalRotationCoreSpecialty.GENERAL_SURGERY, ClinicalRotationCoreRuleEnforcementMode.BLOCK, 8],
    [ClinicalRotationCoreSpecialty.PEDIATRICS, ClinicalRotationCoreRuleEnforcementMode.WARN, 10],
    [ClinicalRotationCoreSpecialty.OBSTETRICS_GYNECOLOGY, ClinicalRotationCoreRuleEnforcementMode.BLOCK, 6]
  ] as const) {
    await prisma.clinicalRotationCoreRule.upsert({
      where: { coreSpecialty_effectiveDate: { coreSpecialty, effectiveDate: new Date("2026-01-01T00:00:00.000Z") } },
      create: {
        coreSpecialty,
        maxWeeks,
        effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
        enforcementMode: mode,
        isActive: true,
        notes: "DEMO_SYNTHETIC_RULE",
        createdByUserId: admin.id,
        updatedByUserId: admin.id
      },
      update: {
        maxWeeks,
        enforcementMode: mode,
        isActive: true,
        notes: "DEMO_SYNTHETIC_RULE",
        updatedByUserId: admin.id
      }
    });
  }

  async function createApplication(student: typeof studentOne, offeringKey: string, status: ClinicalRotationApplicationStatus, weeks = 2) {
    const offering = offerings.get(offeringKey)!;
    const requestedStartAt = offering.startsAt;
    const requestedEndAt = addWeeks(requestedStartAt, weeks);
    const key = studentKeys.get(student.id)!;
    return prisma.clinicalRotationApplication.create({
      data: {
        offeringId: offering.id,
        studentUserId: student.id,
        hospitalId: offering.hospitalId,
        specialtyId: offering.specialtyId,
        departmentId: offering.departmentId,
        studentAnonymousKey: key.studentAnonymousKey,
        keyVersion: key.keyVersion,
        requestedStartAt,
        requestedEndAt,
        durationWeeks: weeks,
        status,
        studentNotes: "בקשת הדגמה סינתטית.",
        hospitalNotes: status === ClinicalRotationApplicationStatus.APPROVED ? "אושר להדגמה." : null,
        eligibilitySnapshot: { importId: eligibilityImport.id, syntheticDemo: true },
        complianceSnapshot: { syntheticDemo: true },
        acceptedRequirementsAt: new Date(),
        decidedByUserId: UNDECIDED_DEMO_APPLICATION_STATUSES.includes(status) ? null : admin.id,
        decidedAt: UNDECIDED_DEMO_APPLICATION_STATUSES.includes(status) ? null : new Date(),
        completedByUserId: status === ClinicalRotationApplicationStatus.COMPLETED ? admin.id : null,
        completedAt: status === ClinicalRotationApplicationStatus.COMPLETED ? new Date() : null,
        cancelledByUserId: status === ClinicalRotationApplicationStatus.CANCELLED ? admin.id : null,
        cancelledAt: status === ClinicalRotationApplicationStatus.CANCELLED ? new Date() : null
      }
    });
  }

  const submitted = await createApplication(studentOne, "1", ClinicalRotationApplicationStatus.SUBMITTED, 2);
  const approvedCash = await createApplication(studentTwo, "1", ClinicalRotationApplicationStatus.APPROVED, 2);
  const waitlisted = await createApplication(studentThree, "2", ClinicalRotationApplicationStatus.WAITLISTED, 2);
  const declined = await createApplication(studentFour, "4", ClinicalRotationApplicationStatus.DECLINED, 2);
  const linkSent = await createApplication(studentFour, "2", ClinicalRotationApplicationStatus.APPROVED, 2);
  const cancellationRequested = await createApplication(studentOne, "10", ClinicalRotationApplicationStatus.CANCELLATION_REQUESTED, 2);
  const cancelled = await createApplication(studentTwo, "10", ClinicalRotationApplicationStatus.CANCELLED, 2);
  const completed = await createApplication(studentThree, "4", ClinicalRotationApplicationStatus.COMPLETED, 2);

  await prisma.clinicalRotationPayment.createMany({
    data: [
      { applicationId: approvedCash.id, method: ClinicalRotationPaymentMethod.CASH_AT_ROTATION, amount: 1500, currency: "ILS", status: ClinicalRotationPaymentStatus.CASH_DUE, updatedByUserId: admin.id },
      { applicationId: linkSent.id, method: ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, amount: 2800, currency: "ILS", paymentLink: "https://payments.example.test/clinical-rotations-demo/link-sent", status: ClinicalRotationPaymentStatus.LINK_SENT, linkSentAt: new Date(), updatedByUserId: admin.id },
      { applicationId: completed.id, method: ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, amount: 3200, currency: "ILS", paymentLink: "https://payments.example.test/clinical-rotations-demo/completed", status: ClinicalRotationPaymentStatus.PAID, linkSentAt: weeksFromNow(-4), paidAt: weeksFromNow(-3), updatedByUserId: admin.id },
      { applicationId: waitlisted.id, method: ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, amount: 2800, currency: "ILS", paymentLink: "https://payments.example.test/clinical-rotations-demo/waitlisted", status: ClinicalRotationPaymentStatus.LINK_DELIVERY_FAILED, updatedByUserId: admin.id },
      { applicationId: declined.id, method: ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, amount: 3200, currency: "ILS", paymentLink: "https://payments.example.test/clinical-rotations-demo/declined", status: ClinicalRotationPaymentStatus.LINK_PENDING, updatedByUserId: admin.id },
      { applicationId: cancelled.id, method: ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK, amount: 700, currency: "ILS", paymentLink: "https://payments.example.test/clinical-rotations-demo/cancelled", status: ClinicalRotationPaymentStatus.OVERDUE, overdueAt: new Date(), updatedByUserId: admin.id }
    ]
  });

  const cancellationRows = [
    [cancellationRequested, ClinicalRotationCancellationStatus.REQUESTED, studentOne.id],
    [cancelled, ClinicalRotationCancellationStatus.APPROVED, admin.id]
  ] as const;
  for (const [application, status, actorUserId] of cancellationRows) {
    await prisma.clinicalRotationCancellation.create({
      data: {
        applicationId: application.id,
        studentUserId: application.studentUserId,
        studentAnonymousKey: application.studentAnonymousKey,
        keyVersion: application.keyVersion,
        hospitalId: application.hospitalId,
        offeringId: application.offeringId,
        departmentId: application.departmentId,
        actorUserId,
        actorType: actorUserId === admin.id ? ClinicalRotationCancellationActorType.ADMIN : ClinicalRotationCancellationActorType.STUDENT,
        status,
        reasonCategory: ClinicalRotationCancellationReasonCategory.SCHEDULE_CONFLICT,
        note: "סיבת ביטול סינתטית להדגמה.",
        applicationStatusAtRequest: application.status,
        beforeApproval: application.status !== ClinicalRotationApplicationStatus.APPROVED,
        paymentStatusAtRequest: status === ClinicalRotationCancellationStatus.REQUESTED ? null : ClinicalRotationPaymentStatus.OVERDUE,
        decidedByUserId: status === ClinicalRotationCancellationStatus.APPROVED ? admin.id : null,
        decidedAt: status === ClinicalRotationCancellationStatus.APPROVED ? new Date() : null
      }
    });
  }

  const groupOffering = offerings.get("2")!;
  const inviteToken = createClinicalRotationInviteToken();
  const group = await prisma.clinicalRotationGroupApplication.create({
    data: {
      offeringId: groupOffering.id,
      hospitalId: groupOffering.hospitalId,
      departmentId: groupOffering.departmentId,
      creatorUserId: studentOne.id,
      creatorStudentAnonymousKey: studentKeys.get(studentOne.id)!.studentAnonymousKey,
      keyVersion: studentKeys.get(studentOne.id)!.keyVersion,
      status: ClinicalRotationGroupStatus.SUBMITTED,
      inviteTokenHash: hashClinicalRotationInviteToken(inviteToken),
      inviteExpiresAt: weeksFromNow(2),
      maxMembers: 4,
      requestedStartAt: weeksFromNow(20),
      requestedEndAt: addWeeks(weeksFromNow(20), 2),
      durationWeeks: 2,
      acceptedRequirementsAt: new Date(),
      complianceSnapshot: { syntheticDemo: true }
    }
  });

  for (const student of [studentOne, studentTwo, studentThree]) {
    const key = studentKeys.get(student.id)!;
    const application = await prisma.clinicalRotationApplication.create({
      data: {
        offeringId: groupOffering.id,
        studentUserId: student.id,
        hospitalId: groupOffering.hospitalId,
        specialtyId: groupOffering.specialtyId,
        departmentId: groupOffering.departmentId,
        studentAnonymousKey: key.studentAnonymousKey,
        keyVersion: key.keyVersion,
        groupId: group.id,
        requestedStartAt: group.requestedStartAt,
        requestedEndAt: group.requestedEndAt,
        durationWeeks: group.durationWeeks,
        status: ClinicalRotationApplicationStatus.SUBMITTED,
        eligibilitySnapshot: { importId: eligibilityImport.id, syntheticDemo: true },
        complianceSnapshot: { syntheticDemo: true },
        acceptedRequirementsAt: new Date()
      }
    });
    await prisma.clinicalRotationGroupMember.create({
      data: {
        groupId: group.id,
        applicationId: application.id,
        userId: student.id,
        studentAnonymousKey: key.studentAnonymousKey,
        keyVersion: key.keyVersion,
        status: ClinicalRotationGroupMemberStatus.JOINED,
        complianceSnapshot: { syntheticDemo: true },
        acceptedRequirementsAt: new Date()
      }
    });
  }

  const failedPayment = await prisma.clinicalRotationPayment.findFirst({
    where: { applicationId: waitlisted.id },
    select: { id: true }
  });
  const sentPayment = await prisma.clinicalRotationPayment.findFirst({
    where: { applicationId: linkSent.id },
    select: { id: true }
  });
  if (sentPayment) {
    await prisma.clinicalRotationNotificationOutbox.create({
      data: {
        type: ClinicalRotationNotificationOutboxType.PAYMENT_LINK_EMAIL,
        status: ClinicalRotationNotificationOutboxStatus.SENT,
        paymentId: sentPayment.id,
        applicationId: linkSent.id,
        hospitalId: linkSent.hospitalId,
        offeringId: linkSent.offeringId,
        attemptCount: 1,
        sentAt: new Date(),
        createdByUserId: admin.id,
        metadata: { syntheticDemo: true, deliveryConfirmed: true }
      }
    });
  }
  if (failedPayment) {
    await prisma.clinicalRotationNotificationOutbox.create({
      data: {
        type: ClinicalRotationNotificationOutboxType.PAYMENT_LINK_EMAIL,
        status: ClinicalRotationNotificationOutboxStatus.FAILED,
        paymentId: failedPayment.id,
        applicationId: waitlisted.id,
        hospitalId: waitlisted.hospitalId,
        offeringId: waitlisted.offeringId,
        attemptCount: 1,
        failedAt: new Date(),
        nextAttemptAt: new Date(),
        lastErrorCategory: "DEMO_DELIVERY_FAILED",
        createdByUserId: admin.id,
        metadata: { syntheticDemo: true }
      }
    });
  }

  await prisma.clinicalRotationAuditLog.createMany({
    data: [
      { actorUserId: admin.id, action: "clinical_rotation.demo_seeded", entityType: "ClinicalRotationDemo", metadata: { syntheticDemo: true, rawIdsPersisted: false } },
      { actorUserId: studentOne.id, action: "clinical_rotation.application_submitted", entityType: "ClinicalRotationApplication", entityId: submitted.id, hospitalId: submitted.hospitalId, offeringId: submitted.offeringId, applicationId: submitted.id, metadata: { syntheticDemo: true } },
      { actorUserId: studentOne.id, action: "clinical_rotation.group_created", entityType: "ClinicalRotationGroupApplication", entityId: group.id, hospitalId: group.hospitalId, offeringId: group.offeringId, groupId: group.id, metadata: { syntheticDemo: true, maxMembers: group.maxMembers } }
    ]
  });

  return {
    password: DEMO_PASSWORD,
    accounts: demoUsers,
    hospitals: Array.from(hospitals.values()).map((hospital) => ({ id: hospital.id, name: hospital.name })),
    offerings: offerings.size,
    applications: 8 + 3,
    groupInviteUrl: `/clinical-rotations/groups/${inviteToken}`,
    eligibilityImportId: eligibilityImport.id
  };
}
