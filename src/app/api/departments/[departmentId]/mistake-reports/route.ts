import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const mistakeReportSchema = z.object({
  explanation: z.string().trim().min(4, "יש להסביר בקצרה מה הטעות.").max(250),
  reporterName: z.string().trim().min(2, "יש להזין שם.").max(80),
  reporterEmail: z.string().trim().email("יש להזין אימייל תקין.").max(160),
  reporterPhone: z.string().trim().max(40).optional().nullable()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { departmentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = mistakeReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  const recentDuplicate = await prisma.departmentMistakeReport.findFirst({
    where: {
      departmentId,
      reporterEmail: parsed.data.reporterEmail.toLowerCase(),
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000)
      }
    },
    select: { id: true }
  });

  if (recentDuplicate) {
    return NextResponse.json({ message: "הדיווח כבר נקלט ונמצא בבדיקה." });
  }

  await prisma.departmentMistakeReport.create({
    data: {
      departmentId,
      explanation: parsed.data.explanation,
      reporterName: parsed.data.reporterName,
      reporterEmail: parsed.data.reporterEmail.toLowerCase(),
      reporterPhone: parsed.data.reporterPhone || null
    }
  });

  return NextResponse.json({ message: "תודה, הדיווח נשמר וייבדק על ידי מנהל." });
}
