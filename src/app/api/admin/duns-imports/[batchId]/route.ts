import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveDataImportBatch } from "@/lib/server/data-import-engine";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve")
  }),
  z.object({
    action: z.literal("reject")
  }),
  z.object({
    action: z.literal("mapRecord"),
    recordId: z.string().cuid(),
    normalizedHospitalId: z.string().cuid().nullable().optional(),
    normalizedSpecialtyId: z.string().cuid().nullable().optional(),
    normalizedDepartmentId: z.string().cuid().nullable().optional()
  })
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "פעולה לא תקינה." }, { status: 400 });
  }

  const { batchId } = await params;
  const batch = await prisma.dataImportBatch.findUnique({
    where: {
      id: batchId
    }
  });

  if (!batch) {
    return NextResponse.json({ error: "ייבוא לא נמצא." }, { status: 404 });
  }

  if (parsed.data.action === "mapRecord") {
    if (batch.status !== "PENDING_REVIEW") {
      return NextResponse.json({ error: "אפשר לעדכן מיפוי רק לפני אישור הייבוא." }, { status: 400 });
    }

    const updated = await prisma.dataImportRecord.updateMany({
      where: {
        id: parsed.data.recordId,
        batchId
      },
      data: {
        normalizedHospitalId: parsed.data.normalizedHospitalId || null,
        normalizedSpecialtyId: parsed.data.normalizedSpecialtyId || null,
        normalizedDepartmentId: parsed.data.normalizedDepartmentId || null,
        confidenceScore: parsed.data.normalizedDepartmentId
          ? 0.82
          : parsed.data.normalizedHospitalId && parsed.data.normalizedSpecialtyId
            ? 0.7
            : 0.35
      }
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "רשומה לא נמצאה בייבוא הזה." }, { status: 404 });
    }

    const updatedRecord = await prisma.dataImportRecord.findUnique({
      where: {
        id: parsed.data.recordId
      }
    });

    return NextResponse.json({ message: "המיפוי נשמר.", record: updatedRecord });
  }

  if (parsed.data.action === "reject") {
    await prisma.dataImportRecord.updateMany({
      where: {
        batchId
      },
      data: {
        status: "REJECTED"
      }
    });
    const rejected = await prisma.dataImportBatch.update({
      where: {
        id: batchId
      },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: session.userId
      }
    });
    return NextResponse.json({ message: "הייבוא נדחה.", batch: rejected });
  }

  const affectedDepartmentIds = await approveDataImportBatch(prisma, batchId);
  const approved = await prisma.dataImportBatch.update({
    where: {
      id: batchId
    },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: session.userId
    }
  });

  return NextResponse.json({
    message: `ייבוא DUNS100 אושר ועודכנו ${affectedDepartmentIds.length} עמודי מחלקה.`,
    batch: approved
  });
}
