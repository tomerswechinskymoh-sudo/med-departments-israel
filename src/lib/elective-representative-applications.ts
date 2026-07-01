import type { ElectiveApplicationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { canManageElectiveDepartment, type ElectiveDepartmentPortalSession } from "@/lib/elective-department-auth";
import { parseDateOnly, validateElectiveApplicationRequest } from "@/lib/elective-availability";
import { prisma } from "@/lib/prisma";
import { sendElectiveDecisionEmail } from "@/lib/services/elective-emails";

export async function getRepresentativeApplication(input: {
  session: ElectiveDepartmentPortalSession;
  applicationId: string;
}) {
  const application = await prisma.electiveApplication.findUnique({
    where: { id: input.applicationId },
    include: {
      department: {
        include: {
          institution: { select: { name: true } },
          specialty: { select: { name: true } }
        }
      }
    }
  });

  if (!application || !canManageElectiveDepartment(input.session, application.departmentId)) {
    return null;
  }

  return application;
}

export async function updateRepresentativeApplicationDecision(input: {
  session: ElectiveDepartmentPortalSession;
  applicationId: string;
  status: Extract<ElectiveApplicationStatus, "APPROVED" | "REJECTED" | "WAITLISTED" | "ALTERNATIVE_OFFERED">;
  representativeNotes?: string | null;
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
}) {
  const application = await getRepresentativeApplication({
    session: input.session,
    applicationId: input.applicationId
  });

  if (!application) {
    return { ok: false as const, status: 404, error: "המועמדות לא נמצאה או אינה משויכת למחלקה שלך." };
  }

  const decisionByRepresentativeId = input.session.accountType === "representative" ? input.session.accountId : null;
  const decisionAt = new Date();
  const data = {
    status: input.status,
    representativeNotes: input.representativeNotes ?? null,
    decisionByRepresentativeId,
    decisionAt
  };

  if (input.status === "APPROVED") {
    if (!application.requestedStartDate || !application.requestedEndDate) {
      return { ok: false as const, status: 400, error: "חסרים תאריכים בבקשה." };
    }

    const validation = await validateElectiveApplicationRequest({
      departmentId: application.departmentId,
      requestedStartDate: application.requestedStartDate,
      requestedEndDate: application.requestedEndDate
    });

    if (!validation.ok) {
      return { ok: false as const, status: 400, error: validation.error };
    }
  }

  const proposedStartDate = input.proposedStartDate ? parseDateOnly(input.proposedStartDate) : null;
  const proposedEndDate = input.proposedEndDate ? parseDateOnly(input.proposedEndDate) : null;

  if (input.status === "ALTERNATIVE_OFFERED") {
    if (!proposedStartDate || !proposedEndDate) {
      return { ok: false as const, status: 400, error: "יש להזין תאריכים חלופיים תקינים." };
    }

    const validation = await validateElectiveApplicationRequest({
      departmentId: application.departmentId,
      requestedStartDate: proposedStartDate,
      requestedEndDate: proposedEndDate
    });

    if (!validation.ok) {
      return { ok: false as const, status: 400, error: validation.error };
    }
  }

  const updated = await prisma.electiveApplication.update({
    where: { id: application.id },
    data: {
      ...data,
      proposedStartDate,
      proposedEndDate,
      proposedByRepresentativeId: input.status === "ALTERNATIVE_OFFERED" ? decisionByRepresentativeId : application.proposedByRepresentativeId
    },
    include: {
      department: {
        include: {
          institution: { select: { name: true } },
          specialty: { select: { name: true } }
        }
      }
    }
  });

  await createAuditLog({
    actorUserId: null,
    action: "elective_department.application_decision_updated",
    entityType: "ElectiveApplication",
    entityId: updated.id,
    metadata: {
      departmentId: updated.departmentId,
      accountId: input.session.accountId,
      accountType: input.session.accountType,
      status: input.status
    }
  });

  try {
    await sendElectiveDecisionEmail({ application: updated });
  } catch (error) {
    console.error("[electives] Failed to send student decision email", {
      applicationId: updated.id,
      status: updated.status,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return { ok: true as const, application: updated };
}
