import crypto from "crypto";

export type LinkedInAuthMode = "login" | "signup" | "connect";
export type LinkedInAccountIntent = "student" | "resident";

type LinkedInStatePayload = {
  mode: LinkedInAuthMode;
  nextPath?: string;
  accountIntent?: LinkedInAccountIntent;
  exp: number;
};

export type LinkedInProfile = {
  linkedinId: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
};

export const LINKEDIN_STATE_COOKIE = "med_linkedin_oauth_state";
const LINKEDIN_STATE_TTL_MS = 1000 * 60 * 10;

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

export function normalizeInternalPath(path?: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return undefined;
  }

  return path;
}

export function createLinkedInStateToken(input: {
  mode: LinkedInAuthMode;
  nextPath?: string;
  accountIntent?: LinkedInAccountIntent;
}) {
  const payload: LinkedInStatePayload = {
    mode: input.mode,
    nextPath: normalizeInternalPath(input.nextPath),
    accountIntent: input.accountIntent,
    exp: Date.now() + LINKEDIN_STATE_TTL_MS
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseLinkedInStateToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as LinkedInStatePayload;

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildLinkedInStartPath(input: {
  mode: LinkedInAuthMode;
  nextPath?: string;
  accountIntent?: LinkedInAccountIntent;
}) {
  const params = new URLSearchParams({
    mode: input.mode
  });

  const nextPath = normalizeInternalPath(input.nextPath);

  if (nextPath) {
    params.set("next", nextPath);
  }

  if (input.accountIntent) {
    params.set("accountIntent", input.accountIntent);
  }

  return `/api/auth/linkedin/start?${params.toString()}`;
}

export function getLinkedInRedirectUri(requestUrl: string) {
  return new URL("/api/auth/linkedin/callback", requestUrl).toString();
}

export function getLinkedInAuthorizeUrl(input: {
  requestUrl: string;
  state: string;
}) {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error("missing_linkedin_client_id");
  }

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getLinkedInRedirectUri(input.requestUrl));
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeLinkedInCode(input: {
  code: string;
  requestUrl: string;
}) {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("missing_linkedin_oauth_env");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: getLinkedInRedirectUri(input.requestUrl),
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("linkedin_token_exchange_failed");
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new Error("linkedin_missing_access_token");
  }

  return payload.access_token;
}

export async function fetchLinkedInProfile(accessToken: string) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("linkedin_userinfo_failed");
  }

  const payload = (await response.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  };

  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.name?.trim();

  if (!payload.sub || !email || !fullName) {
    throw new Error("linkedin_profile_incomplete");
  }

  return {
    linkedinId: payload.sub,
    email,
    fullName,
    profileImageUrl: payload.picture?.trim() || null
  } satisfies LinkedInProfile;
}

export function linkedinErrorMessage(errorCode: string) {
  switch (errorCode) {
    case "admin_not_allowed":
      return "חשבון אדמין לא יכול להתחבר דרך LinkedIn.";
    case "representative_requires_existing_login":
      return "נציגי מחלקות צריכים להתחבר קודם עם אימייל וסיסמה ואז לחבר LinkedIn מתוך הפרופיל.";
    case "linkedin_already_connected":
      return "חשבון LinkedIn הזה כבר מחובר למשתמש אחר.";
    case "email_belongs_to_other_user":
      return "האימייל שחזר מ-LinkedIn כבר שייך לחשבון אחר.";
    case "missing_linkedin_env":
      return "LinkedIn OAuth עדיין לא מוגדר בסביבת העבודה.";
    case "oauth_state_invalid":
      return "תהליך ההתחברות ל-LinkedIn לא הושלם. נסו שוב.";
    default:
      return "ההתחברות עם LinkedIn נכשלה. נסו שוב.";
  }
}
