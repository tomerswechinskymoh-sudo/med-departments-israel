import crypto from "crypto";
import { RoleKey } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { getSession, setSessionCookie, toAppSession } from "@/lib/auth";
import {
  LINKEDIN_STATE_COOKIE,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  linkedinErrorMessage,
  parseLinkedInStateToken
} from "@/lib/linkedin-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function redirectWithError(request: Request, mode: "login" | "signup" | "connect", errorCode: string) {
  const fallbackPath = mode === "signup" ? "/signup" : mode === "connect" ? "/representative" : "/login";
  const url = new URL(fallbackPath, request.url);
  url.searchParams.set("linkedinError", linkedinErrorMessage(errorCode));
  return NextResponse.redirect(url);
}

function redirectWithSuccess(request: Request, path: string, searchParam?: [string, string]) {
  const url = new URL(path, request.url);

  if (searchParam) {
    url.searchParams.set(searchParam[0], searchParam[1]);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stateToken = cookieStore.get(LINKEDIN_STATE_COOKIE)?.value;

  cookieStore.set(LINKEDIN_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  const state = parseLinkedInStateToken(stateToken);

  if (!code || !state || !returnedState || returnedState !== stateToken) {
    return redirectWithError(request, state?.mode ?? "login", "oauth_state_invalid");
  }

  try {
    const accessToken = await exchangeLinkedInCode({ code, requestUrl: request.url });
    const linkedinProfile = await fetchLinkedInProfile(accessToken);
    const currentSession = await getSession();

    if (state.mode === "connect") {
      if (!currentSession || currentSession.role !== "representative") {
        return redirectWithError(request, "connect", "representative_requires_existing_login");
      }

      const currentUser = await prisma.user.findUnique({
        where: {
          id: currentSession.userId
        }
      });

      if (!currentUser || currentUser.roleKey !== RoleKey.REPRESENTATIVE) {
        return redirectWithError(request, "connect", "representative_requires_existing_login");
      }

      const existingLinkedInOwner = await prisma.user.findFirst({
        where: {
          linkedinId: linkedinProfile.linkedinId,
          id: {
            not: currentUser.id
          }
        },
        select: {
          id: true
        }
      });

      if (existingLinkedInOwner) {
        return redirectWithError(request, "connect", "linkedin_already_connected");
      }

      const existingEmailOwner =
        linkedinProfile.email === currentUser.email
          ? null
          : await prisma.user.findFirst({
              where: {
                email: linkedinProfile.email,
                id: {
                  not: currentUser.id
                }
              },
              select: {
                id: true
              }
            });

      if (existingEmailOwner) {
        return redirectWithError(request, "connect", "email_belongs_to_other_user");
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: currentUser.id
        },
        data: {
          fullName: linkedinProfile.fullName,
          email: linkedinProfile.email,
          linkedinId: linkedinProfile.linkedinId,
          profileImageUrl: linkedinProfile.profileImageUrl,
          linkedinConnectedAt: new Date()
        }
      });

      await createAuditLog({
        actorUserId: updatedUser.id,
        action: "auth.linkedin_connected",
        entityType: "User",
        entityId: updatedUser.id
      });

      await setSessionCookie(toAppSession(updatedUser));
      return redirectWithSuccess(request, "/representative", ["linkedin", "connected"]);
    }

    const userByLinkedInId = await prisma.user.findUnique({
      where: {
        linkedinId: linkedinProfile.linkedinId
      }
    });

    if (userByLinkedInId) {
      if (userByLinkedInId.roleKey === RoleKey.ADMIN) {
        return redirectWithError(request, state.mode, "admin_not_allowed");
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: userByLinkedInId.id
        },
        data: {
          fullName: linkedinProfile.fullName,
          profileImageUrl: linkedinProfile.profileImageUrl,
          linkedinConnectedAt: new Date()
        }
      });

      await createAuditLog({
        actorUserId: updatedUser.id,
        action: "auth.linkedin_login",
        entityType: "User",
        entityId: updatedUser.id
      });

      await setSessionCookie(toAppSession(updatedUser));
      return redirectWithSuccess(
        request,
        state.nextPath ?? (updatedUser.roleKey === RoleKey.REPRESENTATIVE ? "/representative" : "/dashboard")
      );
    }

    const userByEmail = await prisma.user.findUnique({
      where: {
        email: linkedinProfile.email
      }
    });

    if (userByEmail) {
      if (userByEmail.roleKey === RoleKey.ADMIN) {
        return redirectWithError(request, state.mode, "admin_not_allowed");
      }

      if (userByEmail.roleKey === RoleKey.REPRESENTATIVE) {
        return redirectWithError(request, state.mode, "representative_requires_existing_login");
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: userByEmail.id
        },
        data: {
          fullName: linkedinProfile.fullName,
          linkedinId: linkedinProfile.linkedinId,
          profileImageUrl: linkedinProfile.profileImageUrl,
          linkedinConnectedAt: new Date()
        }
      });

      await createAuditLog({
        actorUserId: updatedUser.id,
        action: "auth.linkedin_connected",
        entityType: "User",
        entityId: updatedUser.id
      });

      await setSessionCookie(toAppSession(updatedUser));
      return redirectWithSuccess(
        request,
        state.nextPath ?? (updatedUser.roleKey === RoleKey.REPRESENTATIVE ? "/representative" : "/dashboard")
      );
    }

    const roleKey = state.accountIntent === "resident" ? RoleKey.RESIDENT : RoleKey.STUDENT;
    const passwordHash = await hashPassword(`${crypto.randomUUID()}-${crypto.randomUUID()}`);
    const createdUser = await prisma.user.create({
      data: {
        email: linkedinProfile.email,
        fullName: linkedinProfile.fullName,
        passwordHash,
        roleKey,
        linkedinId: linkedinProfile.linkedinId,
        profileImageUrl: linkedinProfile.profileImageUrl,
        linkedinConnectedAt: new Date()
      }
    });

    await createAuditLog({
      actorUserId: createdUser.id,
      action: "auth.linkedin_signup",
      entityType: "User",
      entityId: createdUser.id,
      metadata: {
        accountIntent: state.accountIntent ?? "student"
      }
    });

    await setSessionCookie(toAppSession(createdUser));
    return redirectWithSuccess(request, state.nextPath ?? "/dashboard");
  } catch {
    return redirectWithError(request, state.mode, "oauth_state_invalid");
  }
}
