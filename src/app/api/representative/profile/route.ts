import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { representativeAccountProfileSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "representative") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = representativeAccountProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const existingEmailOwner = await prisma.user.findFirst({
    where: {
      email: parsed.data.email.trim().toLowerCase(),
      id: {
        not: session.userId
      }
    },
    select: {
      id: true
    }
  });

  if (existingEmailOwner) {
    return NextResponse.json({ error: "האימייל הזה כבר שייך לחשבון אחר." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: session.userId
      },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone
      }
    });

    await tx.representativeProfile.upsert({
      where: {
        userId: session.userId
      },
      create: {
        userId: session.userId,
        title: parsed.data.profile.title,
        contactDetails: parsed.data.profile.contactDetails,
        note: parsed.data.profile.note
      },
      update: {
        title: parsed.data.profile.title,
        contactDetails: parsed.data.profile.contactDetails,
        note: parsed.data.profile.note
      }
    });
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "representative.profile_updated",
    entityType: "RepresentativeProfile",
    entityId: session.userId
  });

  return NextResponse.json({ message: "פרופיל הנציג/ה נשמר." });
}

