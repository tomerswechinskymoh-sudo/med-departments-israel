import crypto from "crypto";
import { RoleKey } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getSessionCookieName, type AppRole } from "@/lib/session";

export type AppSession = {
  userId: string;
  email: string;
  fullName: string;
  role: AppRole;
  isApprovedPublisher: boolean;
};

type SessionPayload = {
  userId: string;
  role: AppRole;
  exp: number;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

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
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function mapRole(role: RoleKey): AppRole {
  switch (role) {
    case RoleKey.RESIDENT:
      return "resident";
    case RoleKey.REPRESENTATIVE:
      return "representative";
    case RoleKey.ADMIN:
      return "admin";
    case RoleKey.STUDENT:
    default:
      return "student";
  }
}

export function createSessionToken(input: { userId: string; role: AppRole }) {
  const payload: SessionPayload = {
    userId: input.userId,
    role: input.role,
    exp: Date.now() + SESSION_TTL_MS
  };

  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseSessionToken(token?: string) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as SessionPayload;
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: mapRole(user.roleKey),
    isApprovedPublisher: user.roleKey === RoleKey.REPRESENTATIVE || user.isApprovedPublisher
  } satisfies AppSession;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const payload = parseSessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    }
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: mapRole(user.roleKey),
    isApprovedPublisher: user.roleKey === RoleKey.REPRESENTATIVE || user.isApprovedPublisher
  } satisfies AppSession;
}

export async function setSessionCookie(session: AppSession) {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
