import { redirect } from "next/navigation";
import { RoleKey } from "@prisma/client";
import { getSession } from "@/lib/auth";

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: RoleKey[]) {
  const session = await requireAuth();

  const roleMap = {
    student: RoleKey.STUDENT,
    resident: RoleKey.RESIDENT,
    representative: RoleKey.REPRESENTATIVE,
    admin: RoleKey.ADMIN
  } as const;

  if (!roles.includes(roleMap[session.role])) {
    redirect("/");
  }

  return session;
}

export async function requireAdmin() {
  return requireRole([RoleKey.ADMIN]);
}

export async function requireRepresentative() {
  return requireRole([RoleKey.REPRESENTATIVE]);
}
