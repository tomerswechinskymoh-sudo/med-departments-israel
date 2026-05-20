import { NextResponse } from "next/server";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(request: Request, scope: string, options: RateLimitOptions) {
  const now = Date.now();
  const key = `${scope}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > options.limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000)
    };
  }

  return { ok: true, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(retryAfter, 1))
      }
    }
  );
}
