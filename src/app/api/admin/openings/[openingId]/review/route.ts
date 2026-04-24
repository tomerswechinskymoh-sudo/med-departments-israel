import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { openingContentReviewSchema } from "@/lib/validation";
import { reviewPendingOpening } from "@/server/workflows/opening-content";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ openingId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { openingId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = openingContentReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return reviewPendingOpening(tx, {
        openingId,
        reviewerUserId: session.userId,
        decision: parsed.data.decision,
        adminNote: parsed.data.adminNote
      });
    });

    await createAuditLog({
      actorUserId: session.userId,
      action:
        parsed.data.decision === "APPROVE"
          ? "opening.approved_by_admin"
          : "opening.rejected_by_admin",
      entityType: "ResidencyOpening",
      entityId: openingId
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "לא הצלחנו לעבד את החלטת האדמין."
      },
      { status: 400 }
    );
  }
}
