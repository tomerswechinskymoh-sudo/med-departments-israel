import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { runClinicalRotationRetentionCleanup } from "@/lib/clinical-rotations-privacy";

export const dynamic = "force-dynamic";

function safeEqualSecret(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

function authorizeCleanupRequest(request: Request) {
  const expectedSecret = process.env.CLINICAL_ROTATIONS_CLEANUP_SECRET?.trim();
  if (!expectedSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const headerSecret = request.headers.get("x-clinical-rotations-cleanup-secret")?.trim() ?? "";
  const provided = bearer || headerSecret;

  return provided ? safeEqualSecret(provided, expectedSecret) : false;
}

async function handleCleanup(request: Request) {
  if (!authorizeCleanupRequest(request)) {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const result = await runClinicalRotationRetentionCleanup();
  return NextResponse.json({ ok: true, result });
}

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}
