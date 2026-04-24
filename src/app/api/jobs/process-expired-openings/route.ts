import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processExpiredOpenings } from "@/server/jobs/process-expired-openings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: Request) {
  const session = await getSession();

  if (session?.role === "admin") {
    return true;
  }

  const secret = process.env.OPENINGS_CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-cron-secret")?.trim();

  return bearerToken === secret || headerToken === secret;
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const authorized = await isAuthorized(request);

  if (!authorized) {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 401 });
  }

  const result = await processExpiredOpenings();

  return NextResponse.json({
    message: "עיבוד תקנים פתוחים שעברו את הדדליין הושלם.",
    ...result
  });
}
