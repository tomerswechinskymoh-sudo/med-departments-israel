import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completeSocialAuth } from "@/lib/social-auth-flow";
import {
  exchangeSocialCode,
  fetchSocialProfile,
  getSocialStateCookieName,
  parseSocialStateToken,
  socialAuthErrorMessage
} from "@/lib/social-auth";

function redirectWithError(request: Request, mode: "login" | "signup", errorCode: string) {
  const fallbackPath = mode === "signup" ? "/signup" : "/login";
  const url = new URL(fallbackPath, request.url);
  url.searchParams.set("socialError", socialAuthErrorMessage("facebook", errorCode));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stateCookieName = getSocialStateCookieName("facebook");
  const stateToken = cookieStore.get(stateCookieName)?.value;

  cookieStore.set(stateCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  const state = parseSocialStateToken(stateToken);

  if (!code || !state || !returnedState || returnedState !== stateToken) {
    return redirectWithError(request, state?.mode ?? "login", "oauth_state_invalid");
  }

  try {
    const accessToken = await exchangeSocialCode({
      provider: "facebook",
      code,
      requestUrl: request.url
    });
    const socialProfile = await fetchSocialProfile("facebook", accessToken);
    const result = await completeSocialAuth({
      provider: "facebook",
      profile: socialProfile,
      nextPath: state.nextPath,
      accountIntent: state.accountIntent
    });

    if ("errorCode" in result && result.errorCode) {
      return redirectWithError(request, state.mode, result.errorCode);
    }

    return NextResponse.redirect(new URL(result.redirectPath, request.url));
  } catch (error) {
    return redirectWithError(
      request,
      state.mode,
      error instanceof Error && error.message === "social_profile_incomplete"
        ? "social_profile_incomplete"
        : "oauth_state_invalid"
    );
  }
}
