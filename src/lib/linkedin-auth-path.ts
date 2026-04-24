export type LinkedInAuthMode = "login" | "signup" | "connect";
export type LinkedInAccountIntent = "student" | "resident";

function normalizeInternalPath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return undefined;
  }

  return path;
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
