import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSocialStateToken,
  getSocialAuthorizeUrl,
  getSocialStateCookieName,
  normalizeInternalPath,
  socialAuthErrorMessage,
  socialProviderEnvReady,
  type SocialAccountIntent,
  type SocialAuthMode
} from "@/lib/social-auth";

function redirectWithError(request: Request, mode: SocialAuthMode, errorCode: string) {
  const fallbackPath = mode === "signup" ? "/signup" : "/login";
  const url = new URL(fallbackPath, request.url);
  url.searchParams.set("socialError", socialAuthErrorMessage("google", errorCode));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode !== "login" && mode !== "signup") {
    return redirectWithError(request, "login", "oauth_state_invalid");
  }

  if (!socialProviderEnvReady("google")) {
    return redirectWithError(request, mode, "missing_social_env");
  }

  const nextPath = normalizeInternalPath(searchParams.get("next"));
  const accountIntent = searchParams.get("accountIntent");
  const state = createSocialStateToken({
    mode,
    nextPath,
    accountIntent:
      accountIntent === "resident" || accountIntent === "student"
        ? (accountIntent as SocialAccountIntent)
        : undefined
  });

  const cookieStore = await cookies();
  cookieStore.set(getSocialStateCookieName("google"), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return NextResponse.redirect(
    getSocialAuthorizeUrl({
      provider: "google",
      requestUrl: request.url,
      state
    })
  );
}
