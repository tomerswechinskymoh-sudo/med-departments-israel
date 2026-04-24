import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  LINKEDIN_STATE_COOKIE,
  createLinkedInStateToken,
  getLinkedInAuthorizeUrl,
  linkedinErrorMessage,
  normalizeInternalPath,
  type LinkedInAccountIntent,
  type LinkedInAuthMode
} from "@/lib/linkedin-auth";

function redirectWithError(request: Request, mode: LinkedInAuthMode, errorCode: string) {
  const fallbackPath = mode === "signup" ? "/signup" : mode === "connect" ? "/representative" : "/login";
  const url = new URL(fallbackPath, request.url);
  url.searchParams.set("linkedinError", linkedinErrorMessage(errorCode));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode !== "login" && mode !== "signup" && mode !== "connect") {
    return redirectWithError(request, "login", "oauth_state_invalid");
  }

  const session = await getSession();

  if (mode === "connect") {
    if (!session || session.role !== "representative") {
      return redirectWithError(request, "connect", "representative_requires_existing_login");
    }
  }

  if (!process.env.LINKEDIN_CLIENT_ID?.trim() || !process.env.LINKEDIN_CLIENT_SECRET?.trim()) {
    return redirectWithError(request, mode, "missing_linkedin_env");
  }

  const nextPath = normalizeInternalPath(searchParams.get("next"));
  const accountIntent = searchParams.get("accountIntent");
  const state = createLinkedInStateToken({
    mode,
    nextPath,
    accountIntent:
      accountIntent === "resident" || accountIntent === "student"
        ? (accountIntent as LinkedInAccountIntent)
        : undefined
  });

  const cookieStore = await cookies();
  cookieStore.set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return NextResponse.redirect(getLinkedInAuthorizeUrl({ requestUrl: request.url, state }));
}
