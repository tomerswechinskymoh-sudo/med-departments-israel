import crypto from "crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const ELECTIVE_DEPARTMENT_SESSION_COOKIE = "elective_department_session";
const ELECTIVE_DEPARTMENT_SESSION_TTL_MS = 1000 * 60 * 60 * 8;

type ElectiveDepartmentSessionPayload = {
  kind: "elective_department";
  accountId: string;
  accountType?: "legacy_department" | "representative";
  departmentId?: string;
  exp: number;
};

export type ElectiveDepartmentPortalSession = {
  accountId: string;
  accountType: "legacy_department" | "representative";
  departmentId: string;
  assignedDepartments: Array<{
    id: string;
    name: string;
    institutionName: string;
    specialtyName: string;
    role: string;
  }>;
  username: string;
  name?: string;
  email?: string;
  departmentName: string;
  institutionName: string;
  specialtyName: string;
};

function getSecret() {
  return process.env.AUTH_SECRET ?? "replace-me-in-production";
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(`elective-department:${value}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function isElectiveDepartmentPortalEnabled() {
  return process.env.ENABLE_ELECTIVE_DEPARTMENT_PORTAL === "true" || process.env.ENABLE_ELECTIVE_DEPARTMENT_PORTAL === "1";
}

function createElectiveDepartmentSessionToken(input: { accountId: string; departmentId?: string; accountType: "legacy_department" | "representative" }) {
  const payload: ElectiveDepartmentSessionPayload = {
    kind: "elective_department",
    accountId: input.accountId,
    accountType: input.accountType,
    departmentId: input.departmentId,
    exp: Date.now() + ELECTIVE_DEPARTMENT_SESSION_TTL_MS
  };
  const encodedPayload = encode(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseElectiveDepartmentSessionToken(token?: string) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as ElectiveDepartmentSessionPayload;

    if (payload.kind !== "elective_department" || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function mapAccountToSession(account: {
  id: string;
  departmentId: string;
  username: string;
  department: {
    name: string;
    institution: { name: string };
    specialty: { name: string };
  };
}) {
  return {
    accountId: account.id,
    accountType: "legacy_department",
    departmentId: account.departmentId,
    assignedDepartments: [
      {
        id: account.departmentId,
        name: account.department.name,
        institutionName: account.department.institution.name,
        specialtyName: account.department.specialty.name,
        role: "PRIMARY"
      }
    ],
    username: account.username,
    departmentName: account.department.name,
    institutionName: account.department.institution.name,
    specialtyName: account.department.specialty.name
  } satisfies ElectiveDepartmentPortalSession;
}

function mapRepresentativeToSession(account: {
  id: string;
  username: string;
  name: string;
  email: string;
  assignments: Array<{
    role: string;
    department: {
      id: string;
      name: string;
      institution: { name: string };
      specialty: { name: string };
    };
  }>;
}) {
  const first = account.assignments[0]?.department;

  if (!first) {
    return null;
  }

  return {
    accountId: account.id,
    accountType: "representative" as const,
    departmentId: first.id,
    assignedDepartments: account.assignments.map((assignment) => ({
      id: assignment.department.id,
      name: assignment.department.name,
      institutionName: assignment.department.institution.name,
      specialtyName: assignment.department.specialty.name,
      role: assignment.role
    })),
    username: account.username,
    name: account.name,
    email: account.email,
    departmentName: first.name,
    institutionName: first.institution.name,
    specialtyName: first.specialty.name
  } satisfies ElectiveDepartmentPortalSession;
}

export async function authenticateElectiveDepartmentAccount(username: string, password: string) {
  if (!isElectiveDepartmentPortalEnabled()) {
    return { status: "disabled" as const };
  }

  const representative = await prisma.electiveRepresentativeAccount.findUnique({
    where: { username: username.trim() },
    include: {
      assignments: {
        include: {
          department: {
            select: {
              id: true,
              name: true,
              institution: { select: { name: true } },
              specialty: { select: { name: true } }
            }
          }
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (representative?.isActive) {
    const isValid = await verifyPassword(password, representative.passwordHash);

    if (!isValid) {
      return { status: "invalid" as const };
    }

    const session = mapRepresentativeToSession(representative);

    if (!session) {
      return { status: "invalid" as const };
    }

    await prisma.electiveRepresentativeAccount.update({
      where: { id: representative.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      status: "ok" as const,
      session
    };
  }

  const account = await prisma.electiveDepartmentAccount.findUnique({
    where: { username: username.trim() },
    include: {
      department: {
        select: {
          name: true,
          institution: { select: { name: true } },
          specialty: { select: { name: true } }
        }
      }
    }
  });

  if (!account || !account.isActive) {
    return { status: "invalid" as const };
  }

  const isValid = await verifyPassword(password, account.passwordHash);

  if (!isValid) {
    return { status: "invalid" as const };
  }

  await prisma.electiveDepartmentAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    status: "ok" as const,
    session: mapAccountToSession(account)
  };
}

export async function setElectiveDepartmentSessionCookie(
  session: Pick<ElectiveDepartmentPortalSession, "accountId" | "departmentId"> & Partial<Pick<ElectiveDepartmentPortalSession, "accountType">>
) {
  const cookieStore = await cookies();

  cookieStore.set(ELECTIVE_DEPARTMENT_SESSION_COOKIE, createElectiveDepartmentSessionToken({
    accountId: session.accountId,
    departmentId: session.departmentId,
    accountType: session.accountType ?? "legacy_department"
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ELECTIVE_DEPARTMENT_SESSION_TTL_MS / 1000
  });
}

export async function clearElectiveDepartmentSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ELECTIVE_DEPARTMENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getElectiveDepartmentSession() {
  if (!isElectiveDepartmentPortalEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ELECTIVE_DEPARTMENT_SESSION_COOKIE)?.value;
  const payload = parseElectiveDepartmentSessionToken(token);

  if (!payload) {
    return null;
  }

  if (payload.accountType === "representative") {
    const account = await prisma.electiveRepresentativeAccount.findUnique({
      where: { id: payload.accountId },
      include: {
        assignments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                institution: { select: { name: true } },
                specialty: { select: { name: true } }
              }
            }
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!account?.isActive) {
      return null;
    }

    return mapRepresentativeToSession(account);
  }

  const account = await prisma.electiveDepartmentAccount.findUnique({
    where: { id: payload.accountId },
    include: {
      department: {
        select: {
          name: true,
          institution: { select: { name: true } },
          specialty: { select: { name: true } }
        }
      }
    }
  });

  if (!account || !account.isActive || account.departmentId !== payload.departmentId) {
    return null;
  }

  return mapAccountToSession(account);
}

export async function requireElectiveDepartmentSession() {
  if (!isElectiveDepartmentPortalEnabled()) {
    notFound();
  }

  const session = await getElectiveDepartmentSession();

  if (!session) {
    redirect("/electives/department-login");
  }

  return session;
}

export async function requireElectiveDepartmentApiSession() {
  if (!isElectiveDepartmentPortalEnabled()) {
    return { status: "disabled" as const, session: null };
  }

  const session = await getElectiveDepartmentSession();

  if (!session) {
    return { status: "unauthorized" as const, session: null };
  }

  return { status: "ok" as const, session };
}

export function canManageElectiveDepartment(session: ElectiveDepartmentPortalSession, departmentId: string) {
  return session.assignedDepartments.some((department) => department.id === departmentId);
}

export function getSelectedElectiveDepartment(session: ElectiveDepartmentPortalSession, requestedDepartmentId?: string | null) {
  const selected = requestedDepartmentId && canManageElectiveDepartment(session, requestedDepartmentId)
    ? session.assignedDepartments.find((department) => department.id === requestedDepartmentId)
    : session.assignedDepartments[0];

  return selected ?? null;
}
