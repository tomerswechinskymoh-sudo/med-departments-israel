import { NextResponse } from "next/server";
import { VerificationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, "verification:email", {
    limit: 12,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.redirect(new URL("/login?verificationError=missing", request.url));
  }

  const user = await prisma.user.findUnique({
    where: {
      verificationToken: token
    }
  });

  if (!user || (user.tokenExpiry && user.tokenExpiry < new Date())) {
    return NextResponse.redirect(new URL("/login?verificationError=expired", request.url));
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      emailVerified: true,
      verificationStatus: VerificationStatus.VERIFIED,
      verificationToken: null,
      tokenExpiry: null,
      verifiedAt: new Date()
    }
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "user.email_verified",
    entityType: "User",
    entityId: user.id
  });

  return NextResponse.redirect(new URL("/dashboard?verified=1", request.url));
}
