export function isSafeInternalPath(path?: string | null) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\"));
}

export function safeInternalPath(path: string | null | undefined, fallback = "/dashboard") {
  return isSafeInternalPath(path) ? (path as string) : fallback;
}

export function hasValidSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function sanitizePlainText(value?: string | null, maxLength = 4000) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}
