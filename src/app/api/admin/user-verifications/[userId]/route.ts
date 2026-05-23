import { NextResponse } from "next/server";
import { RoleKey, VerificationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { userVerificationModerationSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = userVerificationModerationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return NextResponse.json({ error: "המשתמש לא נמצא." }, { status: 404 });
  }

  const approved = parsed.data.status === "APPROVED";
  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      roleKey:
        approved && (user.roleStatus === "resident" || user.roleStatus === "specialist")
          ? RoleKey.RESIDENT
          : user.roleKey,
      verificationStatus: approved ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED,
      verificationRejectionReason: approved ? null : parsed.data.adminNote ?? null,
      verifiedByAdminId: session.userId,
      verifiedAt: new Date()
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: approved ? "user.verification_approved" : "user.verification_rejected",
    entityType: "User",
    entityId: userId,
    metadata: {
      roleStatus: user.roleStatus,
      adminNote: parsed.data.adminNote ?? null
    }
  });

  return NextResponse.json({
    message: approved ? "הסטטוס המקצועי אושר." : "בקשת האימות נדחתה."
  });
}
