import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { reportReviewSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי לדווח על תוכן." }, { status: 401 });
  }

  const { reviewId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reportReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: {
      id: reviewId
    }
  });

  if (!review) {
    return NextResponse.json({ error: "השיתוף לא נמצא." }, { status: 404 });
  }

  const report = await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterUserId: session.userId,
      reason: parsed.data.reason,
      details: parsed.data.details
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "review.reported",
    entityType: "ReviewReport",
    entityId: report.id
  });

  return NextResponse.json({ message: "הדיווח נשלח." });
}
