import { NextResponse } from "next/server";
import { DepartmentRepresentativeRequesterRole, UploadedFileCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";

const representativeRequestSchema = z.object({
  requesterName: z.string().trim().min(2, "יש להזין שם.").max(100),
  requesterEmail: z.string().trim().email("יש להזין אימייל תקין.").max(160),
  requesterPhone: z.string().trim().min(8, "יש להזין טלפון תקין.").max(40),
  requesterRole: z.enum(["RESIDENT", "SPECIALIST", "DEPARTMENT_STAFF"]),
  note: z.string().trim().max(500).optional().nullable()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const parsed = representativeRequestSchema.safeParse({
    requesterName: formData.get("requesterName"),
    requesterEmail: formData.get("requesterEmail"),
    requesterPhone: formData.get("requesterPhone"),
    requesterRole: formData.get("requesterRole"),
    note: formData.get("note")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  const email = parsed.data.requesterEmail.toLowerCase();
  const pendingDuplicate = await prisma.departmentRepresentativeRequest.findFirst({
    where: {
      departmentId,
      requesterEmail: email,
      status: "PENDING"
    },
    select: { id: true }
  });

  if (pendingDuplicate) {
    return NextResponse.json({ message: "בקשת הנציגות כבר נקלטה ונמצאת בבדיקה." });
  }

  const proofDocument = readOptionalFormFile(formData.get("proofDocument"));

  const created = await prisma.$transaction(async (tx) => {
    let proofFileId: string | null = null;

    if (proofDocument) {
      const proofFile = await storeUploadedFile(tx, {
        file: proofDocument,
        category: UploadedFileCategory.REPRESENTATIVE_REQUEST_PROOF,
        departmentId,
        isPublic: false
      });
      proofFileId = proofFile.id;
    }

    return tx.departmentRepresentativeRequest.create({
      data: {
        departmentId,
        requesterName: parsed.data.requesterName,
        requesterEmail: email,
        requesterPhone: parsed.data.requesterPhone,
        requesterRole: parsed.data.requesterRole as DepartmentRepresentativeRequesterRole,
        note: parsed.data.note || null,
        proofFileId
      }
    });
  });

  return NextResponse.json({
    id: created.id,
    message: "הבקשה נשמרה. מנהל יאשר לפני קבלת הרשאות נציגות."
  });
}
