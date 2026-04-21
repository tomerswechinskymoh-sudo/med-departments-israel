export type AppRole = "student" | "resident" | "representative" | "admin";

export const SESSION_COOKIE = "med_departments_session";

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
