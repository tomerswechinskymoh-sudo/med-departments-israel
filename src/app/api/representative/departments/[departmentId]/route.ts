import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canUserPublishDepartment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { departmentEditorSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();

  if (!session || !["representative", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { departmentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = departmentEditorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  if (parsed.data.departmentId !== departmentId) {
    return NextResponse.json(
      { error: "חוסר התאמה בין המחלקה לנתונים שנשלחו." },
      { status: 400 }
    );
  }

  const department = await prisma.department.findUnique({
    where: {
      id: departmentId
    }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  if (session.role !== "admin") {
    const canPublish = await canUserPublishDepartment(session.userId, departmentId);

    if (!canPublish) {
      return NextResponse.json(
        { error: "לחשבון זה אין הרשאת פרסום למחלקה הזו." },
        { status: 403 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.department.update({
      where: {
        id: departmentId
      },
      data: {
        shortSummary: parsed.data.shortSummary,
        about: parsed.data.about,
        practicalInfo: parsed.data.practicalInfo,
        publicContactEmail: parsed.data.publicContactEmail,
        publicContactPhone: parsed.data.publicContactPhone
      }
    });

    await tx.departmentHead.deleteMany({
      where: {
        departmentId
      }
    });

    if (parsed.data.heads.length > 0) {
      await tx.departmentHead.createMany({
        data: parsed.data.heads.map((head, index) => ({
          departmentId,
          name: head.name,
          title: head.title,
          bio: head.bio,
          profileImageUrl: head.profileImageUrl,
          displayOrder: index
        }))
      });
    }

    await tx.officialDepartmentUpdate.deleteMany({
      where: {
        departmentId
      }
    });

    if (parsed.data.officialUpdates.length > 0) {
      await tx.officialDepartmentUpdate.createMany({
        data: parsed.data.officialUpdates.map((update) => ({
          departmentId,
          createdByUserId: session.userId,
          title: update.title,
          body: update.body,
          contentStatus: "PUBLISHED",
          publishedAt: new Date()
        }))
      });
    }

    await tx.researchOpportunity.deleteMany({
      where: {
        departmentId
      }
    });

    if (parsed.data.researchOpportunities.length > 0) {
      await tx.researchOpportunity.createMany({
        data: parsed.data.researchOpportunities.map((opportunity) => ({
          departmentId,
          createdByUserId: session.userId,
          title: opportunity.title,
          summary: opportunity.summary,
          description: opportunity.description,
          contactInfo: opportunity.contactInfo,
          contentStatus: "PUBLISHED",
          publishedAt: new Date()
        }))
      });
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "department.updated_by_representative",
    entityType: "Department",
    entityId: departmentId,
    metadata: {
      officialUpdates: parsed.data.officialUpdates.length,
      researchOpportunities: parsed.data.researchOpportunities.length
    }
  });

  return NextResponse.json({ message: "פרטי המחלקה עודכנו." });
}
