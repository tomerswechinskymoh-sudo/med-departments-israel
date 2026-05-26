import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const standardEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmailValue(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[＠﹫]/g, "@")
    .replace(/[．。]/g, ".")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*\.\s*/g, ".")
    .trim();
}

function debugEmailNormalization(label: string, value: unknown) {
  if (typeof value !== "string") return;

  const normalized = normalizeEmailValue(value);
  console.debug(`[scrape-email-normalize] ${label}`, {
    raw: value,
    normalized
  });
}

const normalizedEmailField = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmailValue(value) : value),
  z.union([z.literal(""), z.string().regex(standardEmailRegex, "Invalid email").max(160)])
    .optional()
    .nullable()
);

const revisionPatchSchema = z.object({
  action: z.enum(["update", "approve", "reject"]),
  proposedDepartmentHeadTitle: z.string().trim().max(120).optional().nullable(),
  proposedDepartmentHeadName: z.string().trim().max(160).optional().nullable(),
  proposedDepartmentHeadEmail: normalizedEmailField,
  proposedDepartmentHeadPhone: z.string().trim().max(60).optional().nullable(),
  proposedContactTitle: z.string().trim().max(120).optional().nullable(),
  proposedContactRole: z.string().trim().max(160).optional().nullable(),
  proposedContactName: z.string().trim().max(160).optional().nullable(),
  proposedContactEmail: normalizedEmailField,
  proposedContactPhone: z.string().trim().max(60).optional().nullable(),
  proposedDescription: z.string().trim().max(1600).optional().nullable(),
  proposedSeniorPhysiciansCount: z.coerce.number().int().min(0).max(500).optional().nullable(),
  proposedBedsCount: z.coerce.number().int().min(0).max(5000).optional().nullable(),
  proposedResearchActivity: z.string().trim().max(1600).optional().nullable(),
  proposedApplicationUrl: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
  adminNotes: z.string().trim().max(1000).optional().nullable()
});

function cleanString(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function patchData(parsed: z.infer<typeof revisionPatchSchema>) {
  return {
    proposedDepartmentHeadTitle: cleanString(parsed.proposedDepartmentHeadTitle),
    proposedDepartmentHeadName: cleanString(parsed.proposedDepartmentHeadName),
    proposedDepartmentHeadEmail: cleanString(parsed.proposedDepartmentHeadEmail),
    proposedDepartmentHeadPhone: cleanString(parsed.proposedDepartmentHeadPhone),
    proposedContactTitle: cleanString(parsed.proposedContactTitle),
    proposedContactRole: cleanString(parsed.proposedContactRole),
    proposedContactName: cleanString(parsed.proposedContactName),
    proposedContactEmail: cleanString(parsed.proposedContactEmail),
    proposedContactPhone: cleanString(parsed.proposedContactPhone),
    proposedDescription: cleanString(parsed.proposedDescription),
    proposedSeniorPhysiciansCount: parsed.proposedSeniorPhysiciansCount ?? null,
    proposedBedsCount: parsed.proposedBedsCount ?? null,
    proposedResearchActivity: cleanString(parsed.proposedResearchActivity),
    proposedApplicationUrl: cleanString(parsed.proposedApplicationUrl),
    adminNotes: cleanString(parsed.adminNotes)
  };
}

async function upsertApprovedMetric(
  tx: Prisma.TransactionClient,
  input: {
    departmentId: string;
    metricKey: string;
    label: string;
    value?: number | null;
    rawValue?: string | null;
    sourceUrl: string;
  }
) {
  if (input.value === null && !input.rawValue) return;

  await tx.departmentMetric.upsert({
    where: {
      departmentId_metricKey: {
        departmentId: input.departmentId,
        metricKey: input.metricKey
      }
    },
    create: {
      departmentId: input.departmentId,
      metricKey: input.metricKey,
      label: input.label,
      value: input.value ?? null,
      rawValue: input.rawValue ?? null,
      sourceNotes: `סריקת אתר מאושרת: ${input.sourceUrl}`,
      lastUpdated: new Date()
    },
    update: {
      label: input.label,
      value: input.value ?? null,
      rawValue: input.rawValue ?? null,
      sourceNotes: `סריקת אתר מאושרת: ${input.sourceUrl}`,
      lastUpdated: new Date()
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ revisionId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { revisionId } = await params;
  const body = await request.json().catch(() => null);
  if (body && typeof body === "object") {
    const emailBody = body as Record<string, unknown>;
    debugEmailNormalization("proposedDepartmentHeadEmail", emailBody.proposedDepartmentHeadEmail);
    debugEmailNormalization("proposedContactEmail", emailBody.proposedContactEmail);
  }
  const parsed = revisionPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const existing = await prisma.departmentScrapeRevision.findUnique({
    where: { id: revisionId },
    include: { department: true }
  });

  if (!existing) {
    return NextResponse.json({ error: "הדראפט לא נמצא." }, { status: 404 });
  }

  const data = patchData(parsed.data);

  if (parsed.data.action === "reject") {
    const revision = await prisma.departmentScrapeRevision.update({
      where: { id: revisionId },
      data: {
        ...data,
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: session.userId
      }
    });
    return NextResponse.json({ revision });
  }

  if (parsed.data.action === "update") {
    const revision = await prisma.departmentScrapeRevision.update({
      where: { id: revisionId },
      data
    });
    return NextResponse.json({ revision });
  }

  const revision = await prisma.$transaction(async (tx) => {
    const approved = await tx.departmentScrapeRevision.update({
      where: { id: revisionId },
      data: {
        ...data,
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session.userId
      }
    });

    await tx.department.update({
      where: { id: existing.departmentId },
      data: {
        about: approved.proposedDescription ?? existing.department.about,
        applicationUrl: approved.proposedApplicationUrl ?? existing.department.applicationUrl,
        contactName: approved.proposedContactName ?? existing.department.contactName,
        publicContactEmail:
          approved.proposedContactEmail ??
          approved.proposedDepartmentHeadEmail ??
          existing.department.publicContactEmail,
        publicContactPhone:
          approved.proposedContactPhone ??
          approved.proposedDepartmentHeadPhone ??
          existing.department.publicContactPhone
      }
    });

    await upsertApprovedMetric(tx, {
      departmentId: existing.departmentId,
      metricKey: "seniorPhysiciansCount",
      label: "מספר בכירים",
      value: approved.proposedSeniorPhysiciansCount,
      sourceUrl: approved.sourceUrl
    });
    await upsertApprovedMetric(tx, {
      departmentId: existing.departmentId,
      metricKey: "bedsCount",
      label: "מספר מיטות",
      value: approved.proposedBedsCount,
      sourceUrl: approved.sourceUrl
    });
    await upsertApprovedMetric(tx, {
      departmentId: existing.departmentId,
      metricKey: "researchActivityText",
      label: "פעילות מחקרית",
      rawValue: approved.proposedResearchActivity,
      sourceUrl: approved.sourceUrl
    });

    if (approved.proposedDepartmentHeadName) {
      const currentHead = await tx.departmentHead.findFirst({
        where: {
          departmentId: existing.departmentId,
          name: approved.proposedDepartmentHeadName
        }
      });

      const headData = {
        title: approved.proposedDepartmentHeadTitle ?? "ד״ר",
        role: "מנהל/ת מחלקה",
        bio: `${approved.proposedDepartmentHeadTitle ? `${approved.proposedDepartmentHeadTitle} ` : ""}${approved.proposedDepartmentHeadName} משמש/ת כמנהל/ת מחלקה.`
      };

      if (currentHead) {
        await tx.departmentHead.update({ where: { id: currentHead.id }, data: headData });
      } else {
        await tx.departmentHead.create({
          data: {
            departmentId: existing.departmentId,
            name: approved.proposedDepartmentHeadName,
            ...headData
          }
        });
      }
    }

    return approved;
  });

  return NextResponse.json({ revision });
}
