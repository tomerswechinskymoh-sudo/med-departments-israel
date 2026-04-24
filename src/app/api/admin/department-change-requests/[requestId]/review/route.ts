import { SubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { departmentChangeReviewSchema } from "@/lib/validation";
import { applyDepartmentChangePayload } from "@/server/workflows/department-change-requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { requestId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = departmentChangeReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const requestRecord = await prisma.departmentChangeRequest.findUnique({
    where: {
      id: requestId
    }
  });

  if (!requestRecord) {
    return NextResponse.json({ error: "בקשת השינוי לא נמצאה." }, { status: 404 });
  }

  if (requestRecord.status !== SubmissionStatus.PENDING_REVIEW) {
    return NextResponse.json(
      { error: "בקשת השינוי הזו כבר טופלה." },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.decision === "APPROVE") {
        await applyDepartmentChangePayload(tx, requestRecord.payload, requestRecord.submittedByUserId);
      }

      await tx.departmentChangeRequest.update({
        where: {
          id: requestId
        },
        data: {
          status:
            parsed.data.decision === "APPROVE"
              ? SubmissionStatus.APPROVED
              : SubmissionStatus.REJECTED,
          adminNote: parsed.data.adminNote,
          reviewedAt: new Date(),
          reviewedByUserId: session.userId
        }
      });
    });

    await createAuditLog({
      actorUserId: session.userId,
      action:
        parsed.data.decision === "APPROVE"
          ? "department_change_request.approved"
          : "department_change_request.rejected",
      entityType: "DepartmentChangeRequest",
      entityId: requestId
    });

    return NextResponse.json({
      message:
        parsed.data.decision === "APPROVE"
          ? "השינוי במחלקה אושר ועלה לציבור."
          : "השינוי במחלקה נדחה."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "לא הצלחנו לטפל בבקשת השינוי."
      },
      { status: 400 }
    );
  }
}
