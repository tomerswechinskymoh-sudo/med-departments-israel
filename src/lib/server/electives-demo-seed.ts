import { randomBytes } from "node:crypto";
import {
  ElectiveApplicationStatus,
  ElectiveAvailabilityMode,
  ElectiveRepresentativeAssignmentRole,
  ElectiveWindowStatus,
  Prisma
} from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getPublicDepartmentVisibility } from "@/lib/queries";

const DEMO_PREFIX = "[DEMO]";
const DEMO_REPRESENTATIVE_USERNAME = "demo-electives-rep";
const DEMO_REPRESENTATIVE_EMAIL = "demo.representative@hitmachut.local";
const DEMO_STUDENT_EMAILS = [
  "demo.student1@hitmachut.local",
  "demo.student2@hitmachut.local",
  "demo.student3@hitmachut.local"
];

type DemoDepartment = {
  id: string;
  name: string;
  slug: string;
  residentsCount: number | null;
  institution: { name: string };
  specialty: { name: string };
  metrics: Array<{ metricKey: string; value: number | null; rawValue: string | null }>;
};

type DemoApplicationSeed = {
  department: DemoDepartment;
  applicantEmail: string;
  applicantName: string;
  status: ElectiveApplicationStatus;
  requestedStartDate: Date;
  requestedEndDate: Date;
  proposedStartDate?: Date | null;
  proposedEndDate?: Date | null;
};

export type ElectivesDemoSeedSummary = {
  representativeUsername: string;
  representativeEmail: string;
  representativeTemporaryPassword: string;
  legacyDepartmentUsername: string | null;
  legacyDepartmentTemporaryPassword: string | null;
  selectedDepartments: string[];
  selectedDepartmentIds: string[];
  applicationsByStatus: Record<string, number>;
  links: string[];
};

export function makeElectivesDemoTemporaryPassword() {
  return `El-${randomBytes(9).toString("base64url")}-QA1`;
}

function demoDate(monthOffset: number, dayOfMonth: number) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, 9, 0, 0, 0);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(dayOfMonth, lastDay));
  return date;
}

function describeDepartment(department: DemoDepartment) {
  return `${department.institution.name} · ${department.specialty.name} · ${department.name}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyKeyword(department: DemoDepartment, keywords: string[]) {
  const haystack = normalizeText(`${department.institution.name} ${department.specialty.name} ${department.name}`);
  return keywords.some((keyword) => haystack.includes(keyword));
}

function isPublicDemoDepartment(department: DemoDepartment) {
  return getPublicDepartmentVisibility(department).isPublic;
}

async function loadCandidateDepartments(preferredDepartmentId?: string | null) {
  const candidateSelect = {
    id: true,
    name: true,
    slug: true,
    residentsCount: true,
    institution: { select: { name: true } },
    specialty: { select: { name: true } },
    metrics: {
      where: { metricKey: { in: ["מספר_מתמחים", "residentsCount", "activeResidentsCount"] } },
      select: { metricKey: true, value: true, rawValue: true }
    }
  } satisfies Prisma.DepartmentSelect;

  const preferred = preferredDepartmentId
    ? await prisma.department.findUnique({
        where: { id: preferredDepartmentId },
        select: candidateSelect
      })
    : null;

  const candidates = await prisma.department.findMany({
    where: {
      OR: [
        { residentsCount: { gt: 0 } },
        { metrics: { some: { metricKey: "מספר_מתמחים", value: { gt: 0 } } } }
      ]
    },
    select: candidateSelect,
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }],
    take: 500
  });

  const allCandidates = [
    ...(preferred && isPublicDemoDepartment(preferred) ? [preferred] : []),
    ...candidates.filter((department) => isPublicDemoDepartment(department))
  ] as DemoDepartment[];

  if (allCandidates.length > 0) {
    return allCandidates;
  }

  return prisma.department.findMany({
    select: candidateSelect,
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }],
    take: 20
  }) as Promise<DemoDepartment[]>;
}

function pickDemoDepartments(candidates: DemoDepartment[]) {
  const selected = new Map<string, DemoDepartment>();
  const add = (department?: DemoDepartment | null) => {
    if (department) selected.set(department.id, department);
  };

  add(candidates.find((department) => hasAnyKeyword(department, ["א.א.ג", "אא\"ג", "אף אוזן", "ראש וצוואר", "כירורג"])));
  add(candidates.find((department) => hasAnyKeyword(department, ["רפואה פנימית", "פנימית"])));
  add(candidates.find((department) => hasAnyKeyword(department, ["ילדים", "נשים", "יולדות", "גינקולוג"])));

  for (const department of candidates) {
    if (selected.size >= 3) break;
    add(department);
  }

  return [...selected.values()].slice(0, 3);
}

async function upsertDemoLegacyDepartmentAccount(department: DemoDepartment, password: string) {
  const username = `demo-electives-dept-${department.id.slice(-8)}`;
  const account = await prisma.electiveDepartmentAccount.upsert({
    where: { departmentId: department.id },
    create: {
      departmentId: department.id,
      username,
      passwordHash: await hashPassword(password),
      isActive: true
    },
    update: {
      username,
      passwordHash: await hashPassword(password),
      isActive: true
    }
  });

  return account.username;
}

async function upsertRepresentative(password: string) {
  return prisma.electiveRepresentativeAccount.upsert({
    where: { username: DEMO_REPRESENTATIVE_USERNAME },
    create: {
      name: "נציגת אלקטיבים לדמו",
      email: DEMO_REPRESENTATIVE_EMAIL,
      username: DEMO_REPRESENTATIVE_USERNAME,
      passwordHash: await hashPassword(password),
      phone: "03-0000000",
      isActive: true
    },
    update: {
      name: "נציגת אלקטיבים לדמו",
      email: DEMO_REPRESENTATIVE_EMAIL,
      passwordHash: await hashPassword(password),
      phone: "03-0000000",
      isActive: true
    }
  });
}

async function seedRepresentativeAssignments(representativeId: string, departments: DemoDepartment[]) {
  await prisma.electiveRepresentativeDepartmentAssignment.deleteMany({
    where: { representativeAccountId: representativeId }
  });

  await prisma.electiveRepresentativeDepartmentAssignment.createMany({
    data: departments.map((department, index) => ({
      representativeAccountId: representativeId,
      departmentId: department.id,
      role: index === 0 ? ElectiveRepresentativeAssignmentRole.PRIMARY : ElectiveRepresentativeAssignmentRole.SECONDARY,
      receivesApplicationEmails: true
    })),
    skipDuplicates: true
  });
}

async function seedDepartmentSettings(departments: DemoDepartment[]) {
  const presets = [
    {
      maxStudentsAtOnce: 2,
      availabilityMode: ElectiveAvailabilityMode.OPEN_BY_DEFAULT,
      minDurationDays: 7,
      maxDurationDays: 30,
      notes: `${DEMO_PREFIX} המחלקה פתוחה לרוב התאריכים, למעט תאריכים חסומים.`,
      windows: [
        {
          status: ElectiveWindowStatus.CLOSED,
          startsAt: demoDate(1, 10),
          endsAt: demoDate(1, 15),
          capacityOverride: null,
          reason: `${DEMO_PREFIX} חלון חסום לבדיקה`
        },
        {
          status: ElectiveWindowStatus.CLOSED,
          startsAt: demoDate(1, 25),
          endsAt: demoDate(1, 28),
          capacityOverride: null,
          reason: `${DEMO_PREFIX} חלון חסום לבדיקה`
        }
      ]
    },
    {
      maxStudentsAtOnce: 1,
      availabilityMode: ElectiveAvailabilityMode.CLOSED_BY_DEFAULT,
      minDurationDays: 14,
      maxDurationDays: 30,
      notes: `${DEMO_PREFIX} המחלקה מקבלת אלקטיביסטים רק בחלונות שנפתחו מראש.`,
      windows: [
        {
          status: ElectiveWindowStatus.OPEN,
          startsAt: demoDate(1, 1),
          endsAt: demoDate(1, 14),
          capacityOverride: 1,
          reason: `${DEMO_PREFIX} חלון פתוח לבדיקה`
        },
        {
          status: ElectiveWindowStatus.OPEN,
          startsAt: demoDate(2, 1),
          endsAt: demoDate(2, 21),
          capacityOverride: 1,
          reason: `${DEMO_PREFIX} חלון פתוח לבדיקה`
        }
      ]
    },
    {
      maxStudentsAtOnce: 3,
      availabilityMode: ElectiveAvailabilityMode.OPEN_BY_DEFAULT,
      minDurationDays: 7,
      maxDurationDays: 21,
      notes: `${DEMO_PREFIX} מחלקה לדוגמה עם קיבולת גבוהה יותר.`,
      windows: []
    }
  ];

  for (const [index, department] of departments.entries()) {
    const preset = presets[index] ?? presets[presets.length - 1];

    await prisma.electiveDepartmentSettings.upsert({
      where: { departmentId: department.id },
      create: {
        departmentId: department.id,
        maxStudentsAtOnce: preset.maxStudentsAtOnce,
        availabilityMode: preset.availabilityMode,
        minDurationDays: preset.minDurationDays,
        maxDurationDays: preset.maxDurationDays,
        allowApplications: true,
        contactEmail: DEMO_REPRESENTATIVE_EMAIL,
        contactPhone: "03-0000000",
        instructions: `${DEMO_PREFIX} הנחיות פנימיות לבדיקת זרימת אלקטיבים.`,
        notes: preset.notes,
        adminNotes: `${DEMO_PREFIX} demo settings`
      },
      update: {
        maxStudentsAtOnce: preset.maxStudentsAtOnce,
        availabilityMode: preset.availabilityMode,
        minDurationDays: preset.minDurationDays,
        maxDurationDays: preset.maxDurationDays,
        allowApplications: true,
        contactEmail: DEMO_REPRESENTATIVE_EMAIL,
        contactPhone: "03-0000000",
        instructions: `${DEMO_PREFIX} הנחיות פנימיות לבדיקת זרימת אלקטיבים.`,
        notes: preset.notes,
        adminNotes: `${DEMO_PREFIX} demo settings`
      }
    });

    await prisma.electiveAvailabilityWindow.deleteMany({
      where: {
        departmentId: department.id,
        OR: [{ note: { startsWith: DEMO_PREFIX } }, { reason: { startsWith: DEMO_PREFIX } }]
      }
    });

    if (preset.windows.length > 0) {
      await prisma.electiveAvailabilityWindow.createMany({
        data: preset.windows.map((window) => ({
          departmentId: department.id,
          ...window,
          note: `${DEMO_PREFIX} ${preset.availabilityMode}`
        }))
      });
    }
  }
}

async function upsertDemoApplication(seed: DemoApplicationSeed, representativeId: string) {
  const existing = await prisma.electiveApplication.findFirst({
    where: {
      departmentId: seed.department.id,
      applicantEmail: seed.applicantEmail,
      adminNotes: { startsWith: DEMO_PREFIX }
    },
    select: { id: true }
  });

  const decisionStatuses: ElectiveApplicationStatus[] = [
    ElectiveApplicationStatus.APPROVED,
    ElectiveApplicationStatus.REJECTED,
    ElectiveApplicationStatus.WAITLISTED,
    ElectiveApplicationStatus.ALTERNATIVE_OFFERED
  ];
  const isDecision = decisionStatuses.includes(seed.status);

  const data = {
    departmentId: seed.department.id,
    applicantName: seed.applicantName,
    applicantEmail: seed.applicantEmail,
    applicantPhone: "050-0000000",
    medicalSchool: "פקולטה לדוגמה",
    requestedStartDate: seed.requestedStartDate,
    requestedEndDate: seed.requestedEndDate,
    status: seed.status,
    studentNotes: `${DEMO_PREFIX} בקשת אלקטיב לדוגמה לבדיקה.`,
    representativeNotes: seed.status === ElectiveApplicationStatus.ALTERNATIVE_OFFERED
      ? `${DEMO_PREFIX} מוצעים תאריכים חלופיים לבדיקה.`
      : null,
    adminNotes: `${DEMO_PREFIX} seeded elective application`,
    proposedStartDate: seed.proposedStartDate ?? null,
    proposedEndDate: seed.proposedEndDate ?? null,
    proposedByRepresentativeId: seed.status === ElectiveApplicationStatus.ALTERNATIVE_OFFERED ? representativeId : null,
    decisionByRepresentativeId: isDecision ? representativeId : null,
    decisionAt: isDecision ? new Date() : null
  };

  if (existing) {
    return prisma.electiveApplication.update({
      where: { id: existing.id },
      data,
      select: { status: true }
    });
  }

  return prisma.electiveApplication.create({
    data,
    select: { status: true }
  });
}

async function seedApplications(departments: DemoDepartment[], representativeId: string) {
  const first = departments[0];
  const second = departments[1] ?? first;
  const third = departments[2] ?? first;
  const seeds: DemoApplicationSeed[] = [
    {
      department: first,
      applicantEmail: DEMO_STUDENT_EMAILS[0],
      applicantName: "סטודנטית דמו - הוגש",
      status: ElectiveApplicationStatus.SUBMITTED,
      requestedStartDate: demoDate(1, 16),
      requestedEndDate: demoDate(1, 23)
    },
    {
      department: first,
      applicantEmail: DEMO_STUDENT_EMAILS[1],
      applicantName: "סטודנט דמו - אושר",
      status: ElectiveApplicationStatus.APPROVED,
      requestedStartDate: demoDate(1, 1),
      requestedEndDate: demoDate(1, 8)
    },
    {
      department: third,
      applicantEmail: DEMO_STUDENT_EMAILS[2],
      applicantName: "סטודנטית דמו - נדחה",
      status: ElectiveApplicationStatus.REJECTED,
      requestedStartDate: demoDate(1, 3),
      requestedEndDate: demoDate(1, 10)
    },
    {
      department: second,
      applicantEmail: "demo.student4@hitmachut.local",
      applicantName: "סטודנט דמו - המתנה",
      status: ElectiveApplicationStatus.WAITLISTED,
      requestedStartDate: demoDate(2, 1),
      requestedEndDate: demoDate(2, 14)
    },
    {
      department: second,
      applicantEmail: "demo.student5@hitmachut.local",
      applicantName: "סטודנטית דמו - חלופה",
      status: ElectiveApplicationStatus.ALTERNATIVE_OFFERED,
      requestedStartDate: demoDate(1, 1),
      requestedEndDate: demoDate(1, 14),
      proposedStartDate: demoDate(2, 1),
      proposedEndDate: demoDate(2, 14)
    }
  ];

  const applicationsByStatus: Record<string, number> = {};

  for (const seed of seeds) {
    const application = await upsertDemoApplication(seed, representativeId);
    applicationsByStatus[application.status] = (applicationsByStatus[application.status] ?? 0) + 1;
  }

  return applicationsByStatus;
}

export async function seedElectivesDemo(input: { preferredDepartmentId?: string | null } = {}): Promise<ElectivesDemoSeedSummary> {
  const candidates = await loadCandidateDepartments(input.preferredDepartmentId);
  const departments = pickDemoDepartments(candidates);

  if (departments.length === 0) {
    throw new Error("No departments found for electives demo seed.");
  }

  const representativeTemporaryPassword = makeElectivesDemoTemporaryPassword();
  const representative = await upsertRepresentative(representativeTemporaryPassword);
  const legacyDepartmentTemporaryPassword = makeElectivesDemoTemporaryPassword();
  const legacyDepartmentUsername = await upsertDemoLegacyDepartmentAccount(departments[0], legacyDepartmentTemporaryPassword);

  await seedRepresentativeAssignments(representative.id, departments);
  await seedDepartmentSettings(departments);
  const applicationsByStatus = await seedApplications(departments, representative.id);

  return {
    representativeUsername: representative.username,
    representativeEmail: representative.email,
    representativeTemporaryPassword,
    legacyDepartmentUsername,
    legacyDepartmentTemporaryPassword,
    selectedDepartments: departments.map(describeDepartment),
    selectedDepartmentIds: departments.map((department) => department.id),
    applicationsByStatus,
    links: ["/electives", "/electives/department-login", "/admin/electives/applications"]
  };
}
