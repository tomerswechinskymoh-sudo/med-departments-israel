import {
  ClinicalRotationApplicationStatus,
  ClinicalRotationCoreRuleEnforcementMode,
  ClinicalRotationGroupStatus,
  ClinicalRotationNotificationOutboxStatus,
  ClinicalRotationOfferingStatus,
  ClinicalRotationPaymentStatus,
  ClinicalRotationSourceDeletionStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertClinicalRotationsDemoSeedAllowed } from "@/lib/server/clinical-rotations-demo-seed";

const DEMO_EMAIL_DOMAIN = "clinical-rotations-demo.example.test";
const DEMO_HOSPITAL_SLUG_PREFIX = "clinical-rotations-demo-hospital";
const DEMO_OFFERING_SLUG_PREFIX = "clinical-rotations-demo-offering";
const DEMO_SOURCE_LABEL = "DEMO - Clinical Rotations synthetic eligibility list";

const checks: Array<{ name: string; ok: boolean; detail?: unknown }> = [];

function add(name: string, ok: boolean, detail?: unknown) {
  checks.push({ name, ok, detail });
}

function hasAll<T>(values: Set<T>, expected: T[]) {
  return expected.every((value) => values.has(value));
}

async function main() {
  assertClinicalRotationsDemoSeedAllowed();

  const users = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true, email: true, roleKey: true }
  });
  const userIds = users.map((user) => user.id);
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  const hospitals = await prisma.institution.findMany({
    where: { slug: { startsWith: DEMO_HOSPITAL_SLUG_PREFIX } },
    select: { id: true, name: true, slug: true }
  });
  const hospitalIds = hospitals.map((hospital) => hospital.id);

  const offerings = await prisma.clinicalRotationOffering.findMany({
    where: { slug: { startsWith: DEMO_OFFERING_SLUG_PREFIX } },
    select: {
      id: true,
      status: true,
      isPreviewOnly: true,
      applicationBlockedReason: true,
      groupRegistrationEnabled: true,
      paymentMethod: true
    }
  });
  const offeringIds = offerings.map((offering) => offering.id);

  const applications = await prisma.clinicalRotationApplication.findMany({
    where: {
      OR: [
        { studentUserId: { in: userIds } },
        { hospitalId: { in: hospitalIds } },
        { offeringId: { in: offeringIds } }
      ]
    },
    select: { id: true, status: true, groupId: true }
  });
  const applicationIds = applications.map((application) => application.id);

  const payments = await prisma.clinicalRotationPayment.findMany({
    where: { applicationId: { in: applicationIds } },
    select: { status: true, linkSentAt: true, paymentLink: true }
  });

  const groups = await prisma.clinicalRotationGroupApplication.findMany({
    where: {
      OR: [
        { creatorUserId: { in: userIds } },
        { hospitalId: { in: hospitalIds } },
        { offeringId: { in: offeringIds } }
      ]
    },
    include: { members: true }
  });

  const importRow = await prisma.clinicalRotationEligibilityImport.findFirst({
    where: { sourceLabel: DEMO_SOURCE_LABEL },
    include: { entries: true }
  });

  const identities = await prisma.clinicalRotationStudentIdentity.findMany({
    where: { userId: { in: userIds } },
    select: { status: true, studentAnonymousKey: true, keyVersion: true, pendingDocumentFileId: true }
  });

  const accesses = await prisma.clinicalRotationHospitalAccess.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, hospitalId: true, isActive: true }
  });

  const docAdmin = userByEmail.get(`admin@${DEMO_EMAIL_DOMAIN}`);
  const noDocAdmin = userByEmail.get(`admin-no-docs@${DEMO_EMAIL_DOMAIN}`);
  const docPermissions = await prisma.clinicalRotationAdminPermission.findMany({
    where: { userId: { in: [docAdmin?.id, noDocAdmin?.id].filter(Boolean) as string[] } },
    select: { userId: true, key: true, isActive: true }
  });

  const rules = await prisma.clinicalRotationCoreRule.findMany({
    where: { notes: "DEMO_SYNTHETIC_RULE" },
    select: { enforcementMode: true, isActive: true }
  });

  const cancellations = await prisma.clinicalRotationCancellation.findMany({
    where: { applicationId: { in: applicationIds } },
    select: { status: true, studentAnonymousKey: true, note: true }
  });

  const outbox = await prisma.clinicalRotationNotificationOutbox.findMany({
    where: { applicationId: { in: applicationIds } },
    select: { status: true, lastErrorCategory: true, metadata: true }
  });

  const uploadedClinicalFiles = await prisma.uploadedFile.count({
    where: {
      category: { in: ["CLINICAL_ROTATION_IDENTITY_DOCUMENT", "CLINICAL_ROTATION_ELIGIBILITY_IMPORT"] }
    }
  });

  const offeringStatuses = new Set(offerings.map((offering) => offering.status));
  const applicationStatuses = new Set(applications.map((application) => application.status));
  const paymentStatuses = new Set(payments.map((payment) => payment.status));
  const outboxStatuses = new Set(outbox.map((entry) => entry.status));
  const ruleModes = new Set(rules.map((rule) => rule.enforcementMode));

  add("demo users exist", users.length === 11, users.length);
  add("demo hospitals exist", hospitals.length === 3, hospitals.length);
  add("demo coordinator access scoped one hospital each", accesses.length === 3 && accesses.every((access) => access.isActive) && new Set(accesses.map((access) => access.hospitalId)).size === 3, accesses);
  add("only document-review admin has explicit permission", docPermissions.length === 1 && docPermissions[0]?.userId === docAdmin?.id && docPermissions[0]?.isActive === true, docPermissions);
  add("demo offerings exist", offerings.length === 10, offerings.length);
  add("all offering lifecycle states represented", hasAll(offeringStatuses, [
    ClinicalRotationOfferingStatus.DRAFT,
    ClinicalRotationOfferingStatus.PUBLISHED,
    ClinicalRotationOfferingStatus.PAUSED,
    ClinicalRotationOfferingStatus.CLOSED,
    ClinicalRotationOfferingStatus.CANCELLED
  ]), Array.from(offeringStatuses));
  add("preview-only offering is application-blocked", offerings.some((offering) => offering.isPreviewOnly && Boolean(offering.applicationBlockedReason)));
  add("group-enabled offerings represented", offerings.some((offering) => offering.groupRegistrationEnabled));
  add("demo identities use pseudonymous keys only", identities.length === 6 && identities.every((identity) => identity.studentAnonymousKey && identity.keyVersion === 1 && !identity.pendingDocumentFileId), identities.length);
  add("active eligibility import has HMAC-only entries and no source file", importRow?.status === "ACTIVE" && importRow.entries.length === 4 && !importRow.sourceFileId && importRow.sourceDeletionStatus === ClinicalRotationSourceDeletionStatus.NOT_STORED, importRow && { entries: importRow.entries.length, sourceFileId: importRow.sourceFileId, sourceDeletionStatus: importRow.sourceDeletionStatus });
  add("core rules include WARN and BLOCK", rules.length >= 4 && hasAll(ruleModes, [ClinicalRotationCoreRuleEnforcementMode.WARN, ClinicalRotationCoreRuleEnforcementMode.BLOCK]), Array.from(ruleModes));
  add("demo applications include individual and group records", applications.length === 11 && applications.some((application) => application.groupId), applications.length);
  add("all key application states represented", hasAll(applicationStatuses, [
    ClinicalRotationApplicationStatus.SUBMITTED,
    ClinicalRotationApplicationStatus.APPROVED,
    ClinicalRotationApplicationStatus.WAITLISTED,
    ClinicalRotationApplicationStatus.DECLINED,
    ClinicalRotationApplicationStatus.CANCELLATION_REQUESTED,
    ClinicalRotationApplicationStatus.CANCELLED,
    ClinicalRotationApplicationStatus.COMPLETED
  ]), Array.from(applicationStatuses));
  add("payment states cover delivery/retry/local scenarios", hasAll(paymentStatuses, [
    ClinicalRotationPaymentStatus.CASH_DUE,
    ClinicalRotationPaymentStatus.LINK_SENT,
    ClinicalRotationPaymentStatus.PAID,
    ClinicalRotationPaymentStatus.LINK_DELIVERY_FAILED,
    ClinicalRotationPaymentStatus.LINK_PENDING,
    ClinicalRotationPaymentStatus.OVERDUE
  ]), Array.from(paymentStatuses));
  add("payment link sent has timestamp only after delivered", payments.some((payment) => payment.status === ClinicalRotationPaymentStatus.LINK_SENT && payment.linkSentAt));
  add("payment delivery outbox has sent and failed records", hasAll(outboxStatuses, [ClinicalRotationNotificationOutboxStatus.SENT, ClinicalRotationNotificationOutboxStatus.FAILED]), Array.from(outboxStatuses));
  add("group application is private invitation-only", groups.length === 1 && groups[0]?.status === ClinicalRotationGroupStatus.SUBMITTED && groups[0]?.members.length === 3 && /^[a-f0-9]{64}$/.test(groups[0]?.inviteTokenHash ?? ""), groups.map((group) => ({ members: group.members.length, hashLength: group.inviteTokenHash.length })));
  add("cancellation audit data is synthetic and pseudonymous", cancellations.length === 2 && cancellations.every((row) => row.studentAnonymousKey && row.note?.includes("סינתטית")), cancellations.length);
  add("no pending clinical document/source uploads remain in demo seed", uploadedClinicalFiles === 0, uploadedClinicalFiles);

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    console.error(JSON.stringify({ status: "fail", failed }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    status: "ok",
    users: users.length,
    hospitals: hospitals.length,
    offerings: offerings.length,
    applications: applications.length,
    groups: groups.length,
    payments: payments.length,
    cancellations: cancellations.length,
    eligibilityEntries: importRow?.entries.length ?? 0,
    paymentStatuses: Array.from(paymentStatuses).sort(),
    offeringStatuses: Array.from(offeringStatuses).sort()
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
