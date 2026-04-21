import { NextResponse } from "next/server";
import { PublisherRequestStatus, RoleKey } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { publisherRequestModerationSchema } from "@/lib/validation";

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
  const parsed = publisherRequestModerationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const publisherRequest = await prisma.publisherRequest.findUnique({
    where: {
      id: requestId
    }
  });

  if (!publisherRequest) {
    return NextResponse.json({ error: "הבקשה לא נמצאה." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.publisherRequest.update({
      where: {
        id: requestId
      },
      data: {
        status: parsed.data.status as PublisherRequestStatus,
        adminNote: parsed.data.adminNote,
        reviewedAt: new Date(),
        reviewedByUserId: session.userId
      }
    });

    if (parsed.data.status === "APPROVED") {
      await tx.user.update({
        where: {
          id: publisherRequest.userId
        },
        data: {
          roleKey: RoleKey.REPRESENTATIVE,
          isApprovedPublisher: true
        }
      });
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action:
      parsed.data.status === "APPROVED"
        ? "publisher_request.approved"
        : "publisher_request.rejected",
    entityType: "PublisherRequest",
    entityId: requestId
  });

  return NextResponse.json({ message: "בקשת הפרסום עודכנה." });
}
