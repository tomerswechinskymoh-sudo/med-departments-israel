import crypto from "crypto";

export type SocialAuthProvider = "google" | "facebook";
export type SocialAuthMode = "login" | "signup";
export type SocialAccountIntent = "student" | "resident";

type SocialStatePayload = {
  mode: SocialAuthMode;
  nextPath?: string;
  accountIntent?: SocialAccountIntent;
  exp: number;
};

export type SocialProfile = {
  providerUserId: string;
  fullName: string;
  email: string;
  profileImageUrl: string | null;
};

const SOCIAL_STATE_TTL_MS = 1000 * 60 * 10;

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

export function socialProviderLabel(provider: SocialAuthProvider) {
  return provider === "google" ? "Google" : "Facebook";
}

export function getSocialStateCookieName(provider: SocialAuthProvider) {
  return `med_${provider}_oauth_state`;
}

export function normalizeInternalPath(path?: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return undefined;
  }

  return path;
}

export function buildSocialStartPath(input: {
  provider: SocialAuthProvider;
  mode: SocialAuthMode;
  nextPath?: string;
  accountIntent?: SocialAccountIntent;
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

  return `/api/auth/${input.provider}/start?${params.toString()}`;
}

export function createSocialStateToken(input: {
  mode: SocialAuthMode;
  nextPath?: string;
  accountIntent?: SocialAccountIntent;
}) {
  const payload: SocialStatePayload = {
    mode: input.mode,
    nextPath: normalizeInternalPath(input.nextPath),
    accountIntent: input.accountIntent,
    exp: Date.now() + SOCIAL_STATE_TTL_MS
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseSocialStateToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as SocialStatePayload;

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getClientId(provider: SocialAuthProvider) {
  if (provider === "google") {
    return process.env.GOOGLE_CLIENT_ID?.trim();
  }

  return process.env.FACEBOOK_CLIENT_ID?.trim();
}

function getClientSecret(provider: SocialAuthProvider) {
  if (provider === "google") {
    return process.env.GOOGLE_CLIENT_SECRET?.trim();
  }

  return process.env.FACEBOOK_CLIENT_SECRET?.trim();
}

export function socialProviderEnvReady(provider: SocialAuthProvider) {
  return Boolean(getClientId(provider) && getClientSecret(provider));
}

export function getSocialRedirectUri(provider: SocialAuthProvider, requestUrl: string) {
  return new URL(`/api/auth/${provider}/callback`, requestUrl).toString();
}

export function getSocialAuthorizeUrl(input: {
  provider: SocialAuthProvider;
  requestUrl: string;
  state: string;
}) {
  const clientId = getClientId(input.provider);

  if (!clientId) {
    throw new Error("missing_social_client_id");
  }

  if (input.provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", getSocialRedirectUri(input.provider, input.requestUrl));
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", input.state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  const url = new URL("https://www.facebook.com/v23.0/dialog/oauth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getSocialRedirectUri(input.provider, input.requestUrl));
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeSocialCode(input: {
  provider: SocialAuthProvider;
  code: string;
  requestUrl: string;
}) {
  const clientId = getClientId(input.provider);
  const clientSecret = getClientSecret(input.provider);

  if (!clientId || !clientSecret) {
    throw new Error("missing_social_oauth_env");
  }

  if (input.provider === "google") {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: getSocialRedirectUri(input.provider, input.requestUrl),
      client_id: clientId,
      client_secret: clientSecret
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString(),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("social_token_exchange_failed");
    }

    const payload = (await response.json()) as { access_token?: string };

    if (!payload.access_token) {
      throw new Error("social_missing_access_token");
    }

    return payload.access_token;
  }

  const url = new URL("https://graph.facebook.com/v23.0/oauth/access_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("redirect_uri", getSocialRedirectUri(input.provider, input.requestUrl));
  url.searchParams.set("code", input.code);

  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("social_token_exchange_failed");
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new Error("social_missing_access_token");
  }

  return payload.access_token;
}

export async function fetchSocialProfile(provider: SocialAuthProvider, accessToken: string) {
  if (provider === "google") {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("social_userinfo_failed");
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
      throw new Error("social_profile_incomplete");
    }

    return {
      providerUserId: payload.sub,
      email,
      fullName,
      profileImageUrl: payload.picture?.trim() || null
    } satisfies SocialProfile;
  }

  const response = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("social_userinfo_failed");
  }

  const payload = (await response.json()) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: {
      data?: {
        url?: string;
      };
    };
  };

  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.name?.trim();

  if (!payload.id || !email || !fullName) {
    throw new Error("social_profile_incomplete");
  }

  return {
    providerUserId: payload.id,
    email,
    fullName,
    profileImageUrl: payload.picture?.data?.url?.trim() || null
  } satisfies SocialProfile;
}

export function socialAuthErrorMessage(provider: SocialAuthProvider, errorCode: string) {
  const providerLabel = socialProviderLabel(provider);

  switch (errorCode) {
    case "admin_not_allowed":
      return "חשבון אדמין לא יכול להתחבר דרך רשתות חברתיות.";
    case "representative_requires_existing_login":
      return "נציגי מחלקות צריכים להתחבר עם אימייל וסיסמה. כרגע חיבור social עבורם זמין רק דרך LinkedIn מתוך הפרופיל.";
    case "provider_already_connected":
      return `חשבון ${providerLabel} הזה כבר מחובר למשתמש אחר.`;
    case "email_belongs_to_other_user":
      return `האימייל שחזר מ-${providerLabel} כבר שייך לחשבון אחר.`;
    case "missing_social_env":
      return `${providerLabel} OAuth עדיין לא מוגדר בסביבת העבודה.`;
    case "social_profile_incomplete":
      return `לא הצלחנו לקבל מ-${providerLabel} שם מלא ואימייל. בדקו שההרשאות באפליקציה מוגדרות נכון ונסו שוב.`;
    case "oauth_state_invalid":
      return `תהליך ההתחברות ל-${providerLabel} לא הושלם. נסו שוב.`;
    default:
      return `ההתחברות עם ${providerLabel} נכשלה. נסו שוב.`;
  }
}
