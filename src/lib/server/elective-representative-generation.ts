import { createHmac } from "node:crypto";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function normalizeSlug(value: string) {
  const ascii = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return ascii || "hospital";
}

function passwordSecret() {
  if (process.env.ELECTIVES_REP_PASSWORD_SECRET) {
    return { secret: process.env.ELECTIVES_REP_PASSWORD_SECRET, warning: null };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ELECTIVES_REP_PASSWORD_SECRET is required in production.");
  }

  return {
    secret: "local-demo-electives-representative-secret",
    warning: "ELECTIVES_REP_PASSWORD_SECRET missing; local/demo fallback was used."
  };
}

export function generateHospitalElectivesUsername(input: { hospitalName: string; hospitalSlug?: string | null }) {
  const base = normalizeSlug(input.hospitalSlug || input.hospitalName);
  return `${base}_electives`;
}

export function generateHospitalElectivesTempPassword(hospitalName: string, secret: string) {
  const digest = createHmac("sha256", secret).update(`electives-rep:${hospitalName}`).digest("base64url");

  return `El-${digest.slice(0, 6)}-${digest.slice(6, 12)}-1aA`;
}

export async function generateElectiveRepresentativesByHospital(input: { resetExistingPasswords?: boolean } = {}) {
  const { secret, warning } = passwordSecret();
  const departments = await prisma.department.findMany({
    where: {
      OR: [
        { electiveSettings: { isNot: null } },
        { electiveTrackSettings: { some: {} } }
      ]
    },
    select: {
      id: true,
      institution: { select: { id: true, name: true, slug: true } }
    },
    orderBy: [{ institution: { name: "asc" } }]
  });
  const groups = new Map<string, { hospitalName: string; hospitalSlug: string | null; departmentIds: string[] }>();

  for (const department of departments) {
    const group = groups.get(department.institution.id) ?? {
      hospitalName: department.institution.name,
      hospitalSlug: department.institution.slug,
      departmentIds: []
    };
    group.departmentIds.push(department.id);
    groups.set(department.institution.id, group);
  }

  const results = [];

  for (const group of groups.values()) {
    const username = generateHospitalElectivesUsername({
      hospitalName: group.hospitalName,
      hospitalSlug: group.hospitalSlug
    });
    const emailKey = createHmac("sha256", secret).update(`electives-rep-email:${group.hospitalName}`).digest("hex").slice(0, 12);
    const email = `electives-${emailKey}@hitmachut.local`;
    const tempPassword = generateHospitalElectivesTempPassword(group.hospitalName, secret);
    const existing = await prisma.electiveRepresentativeAccount.findUnique({ where: { username } });
    const shouldSetPassword = !existing || input.resetExistingPasswords;
    const representative = await prisma.electiveRepresentativeAccount.upsert({
      where: { username },
      create: {
        name: `נציג/ת אלקטיבים - ${group.hospitalName}`,
        email,
        username,
        passwordHash: await hashPassword(tempPassword),
        isActive: true
      },
      update: {
        name: `נציג/ת אלקטיבים - ${group.hospitalName}`,
        email,
        isActive: true,
        ...(shouldSetPassword ? { passwordHash: await hashPassword(tempPassword) } : {})
      }
    });

    await prisma.electiveRepresentativeDepartmentAssignment.createMany({
      data: group.departmentIds.map((departmentId) => ({
        representativeAccountId: representative.id,
        departmentId,
        role: "PRIMARY" as const,
        receivesApplicationEmails: true
      })),
      skipDuplicates: true
    });

    results.push({
      hospitalName: group.hospitalName,
      username,
      departmentCount: group.departmentIds.length,
      status: existing ? "updated" : "created",
      temporaryPassword: shouldSetPassword ? tempPassword : null
    });
  }

  return {
    ok: true,
    warning,
    hospitalsProcessed: results.length,
    representativesCreated: results.filter((result) => result.status === "created").length,
    representativesUpdated: results.filter((result) => result.status === "updated").length,
    results
  };
}

export async function resetHospitalElectiveRepresentativePassword(username: string) {
  const { secret, warning } = passwordSecret();
  const representative = await prisma.electiveRepresentativeAccount.findUnique({
    where: { username },
    include: {
      assignments: {
        include: {
          department: {
            select: { institution: { select: { name: true } } }
          }
        },
        take: 1
      }
    }
  });

  if (!representative) {
    throw new Error("Representative not found.");
  }

  const hospitalName = representative.assignments[0]?.department.institution.name ?? representative.name;
  const temporaryPassword = generateHospitalElectivesTempPassword(hospitalName, secret);

  await prisma.electiveRepresentativeAccount.update({
    where: { id: representative.id },
    data: { passwordHash: await hashPassword(temporaryPassword) }
  });

  return { username: representative.username, temporaryPassword, warning };
}
