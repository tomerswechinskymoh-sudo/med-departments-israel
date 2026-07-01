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
  departmentId: string;
  exp: number;
};

export type ElectiveDepartmentPortalSession = {
  accountId: string;
  departmentId: string;
  username: string;
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

function createElectiveDepartmentSessionToken(input: { accountId: string; departmentId: string }) {
  const payload: ElectiveDepartmentSessionPayload = {
    kind: "elective_department",
    accountId: input.accountId,
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
    departmentId: account.departmentId,
    username: account.username,
    departmentName: account.department.name,
    institutionName: account.department.institution.name,
    specialtyName: account.department.specialty.name
  } satisfies ElectiveDepartmentPortalSession;
}

export async function authenticateElectiveDepartmentAccount(username: string, password: string) {
  if (!isElectiveDepartmentPortalEnabled()) {
    return { status: "disabled" as const };
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

export async function setElectiveDepartmentSessionCookie(session: Pick<ElectiveDepartmentPortalSession, "accountId" | "departmentId">) {
  const cookieStore = await cookies();

  cookieStore.set(ELECTIVE_DEPARTMENT_SESSION_COOKIE, createElectiveDepartmentSessionToken(session), {
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
