import { NextResponse } from "next/server";
import { RoleKey } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().trim().max(1000).optional().nullable()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { requestId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const representativeRequest = await prisma.departmentRepresentativeRequest.findUnique({
    where: { id: requestId }
  });

  if (!representativeRequest) {
    return NextResponse.json({ error: "הבקשה לא נמצאה." }, { status: 404 });
  }

  if (parsed.data.action === "reject") {
    const updated = await prisma.departmentRepresentativeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        adminNotes: parsed.data.adminNotes ?? null,
        reviewedAt: new Date(),
        reviewedById: session.userId
      }
    });

    return NextResponse.json({ request: updated });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: representativeRequest.requesterEmail
    }
  });

  if (!user) {
    return NextResponse.json(
      { error: "לא נמצא משתמש עם האימייל הזה. יש לבקש מהמבקש/ת להירשם לפני אישור." },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        roleKey: RoleKey.REPRESENTATIVE,
        isApprovedPublisher: true
      }
    });

    await tx.representativeProfile.upsert({
      where: { userId: user.id },
      update: {
        title: representativeRequest.requesterRole === "RESIDENT" ? "מתמחה" : "נציג/ת מחלקה",
        contactDetails: `${representativeRequest.requesterEmail} · ${representativeRequest.requesterPhone}`
      },
      create: {
        userId: user.id,
        title: representativeRequest.requesterRole === "RESIDENT" ? "מתמחה" : "נציג/ת מחלקה",
        contactDetails: `${representativeRequest.requesterEmail} · ${representativeRequest.requesterPhone}`
      }
    });

    await tx.representativeAssignment.upsert({
      where: {
        userId_departmentId: {
          userId: user.id,
          departmentId: representativeRequest.departmentId
        }
      },
      update: {},
      create: {
        userId: user.id,
        departmentId: representativeRequest.departmentId,
        createdByUserId: session.userId
      }
    });

    return tx.departmentRepresentativeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        adminNotes: parsed.data.adminNotes ?? null,
        reviewedAt: new Date(),
        reviewedById: session.userId
      }
    });
  });

  return NextResponse.json({ request: updated });
}
