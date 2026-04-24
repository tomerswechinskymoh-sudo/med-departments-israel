import { ContentStatus, Prisma, SubmissionStatus } from "@prisma/client";
import { departmentEditorSchema } from "@/lib/validation";

type PrismaLike = Prisma.TransactionClient;
type DepartmentChangePayload = Prisma.JsonValue;

function parseDepartmentPayload(payload: DepartmentChangePayload) {
  const parsed = departmentEditorSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "בקשת השינוי למחלקה אינה תקינה.");
  }

  return parsed.data;
}

export function buildDepartmentChangeSummary(payload: DepartmentChangePayload) {
  const parsed = parseDepartmentPayload(payload);
  const officialUpdatesCount = parsed.officialUpdates.length;
  const researchCount = parsed.researchOpportunities.length;

  return `עדכון עמוד מחלקה, ${officialUpdatesCount} עדכונים רשמיים, ${researchCount} הזדמנויות מחקר`;
}

export async function applyDepartmentChangePayload(
  tx: PrismaLike,
  payload: DepartmentChangePayload,
  submittedByUserId: string
) {
  const parsed = parseDepartmentPayload(payload);

  await tx.department.update({
    where: {
      id: parsed.departmentId
    },
    data: {
      shortSummary: parsed.shortSummary,
      about: parsed.about,
      practicalInfo: parsed.practicalInfo,
      publicContactEmail: parsed.publicContactEmail,
      publicContactPhone: parsed.publicContactPhone
    }
  });

  await tx.departmentHead.deleteMany({
    where: {
      departmentId: parsed.departmentId
    }
  });

  await tx.departmentHead.createMany({
    data: parsed.heads.map((head, index) => ({
      departmentId: parsed.departmentId,
      name: head.name,
      title: head.title,
      bio: head.bio,
      profileImageUrl: head.profileImageUrl,
      displayOrder: index
    }))
  });

  await tx.officialDepartmentUpdate.deleteMany({
    where: {
      departmentId: parsed.departmentId
    }
  });

  if (parsed.officialUpdates.length > 0) {
    await tx.officialDepartmentUpdate.createMany({
      data: parsed.officialUpdates.map((update) => ({
        departmentId: parsed.departmentId,
        createdByUserId: submittedByUserId,
        title: update.title,
        body: update.body,
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date()
      }))
    });
  }

  await tx.researchOpportunity.deleteMany({
    where: {
      departmentId: parsed.departmentId
    }
  });

  if (parsed.researchOpportunities.length > 0) {
    await tx.researchOpportunity.createMany({
      data: parsed.researchOpportunities.map((opportunity) => ({
        departmentId: parsed.departmentId,
        createdByUserId: submittedByUserId,
        title: opportunity.title,
        summary: opportunity.summary,
        description: opportunity.description,
        contactInfo: opportunity.contactInfo,
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date()
      }))
    });
  }

  return parsed;
}

export async function upsertDepartmentChangeRequest(
  tx: PrismaLike,
  input: {
    departmentId: string;
    submittedByUserId: string;
    payload: DepartmentChangePayload;
  }
) {
  const summary = buildDepartmentChangeSummary(input.payload);
  const existingRequest = await tx.departmentChangeRequest.findFirst({
    where: {
      departmentId: input.departmentId,
      submittedByUserId: input.submittedByUserId,
      status: SubmissionStatus.PENDING_REVIEW
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existingRequest) {
    return tx.departmentChangeRequest.update({
      where: {
        id: existingRequest.id
      },
      data: {
        payload: input.payload ?? {},
        summary,
        adminNote: null,
        reviewedAt: null,
        reviewedByUserId: null
      }
    });
  }

  return tx.departmentChangeRequest.create({
    data: {
      departmentId: input.departmentId,
      submittedByUserId: input.submittedByUserId,
      summary,
      payload: input.payload ?? {},
    }
  });
}
