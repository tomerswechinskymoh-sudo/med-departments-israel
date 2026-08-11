import { z } from "zod";
import {
  clinicalRotationCoreRuleEnforcementModeValues,
  clinicalRotationCoreSpecialtyValues,
  clinicalRotationPaymentMethodValues,
  clinicalRotationPaymentStatusValues,
  clinicalRotationPriceUnitValues
} from "@/lib/clinical-rotations-shared";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "יש להזין תאריך תקין.");

export const clinicalRotationApplicationSubmissionSchema = z.object({
  offeringId: z.string().min(1, "חסר מזהה סבב."),
  requestedStartAt: dateString,
  requestedEndAt: dateString,
  acceptedRequirements: z.boolean().default(false),
  studentNotes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationIdentitySubmissionSchema = z.object({
  israeliId: z.string().min(5, "יש להזין תעודת זהות.").max(20)
});

export const clinicalRotationEligibilityImportSchema = z.object({
  sourceLabel: z.string().min(2, "יש להזין תווית מקור.").max(180),
  activate: z.boolean().default(true)
});

export const clinicalRotationGroupCreateSchema = z.object({
  offeringId: z.string().min(1, "חסר מזהה סבב."),
  requestedStartAt: dateString,
  requestedEndAt: dateString,
  maxMembers: z.coerce.number().int().min(2).max(30),
  acceptedRequirements: z.boolean().default(false),
  studentNotes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationGroupJoinSchema = z.object({
  inviteToken: z.string().min(20),
  requestedStartAt: dateString.optional(),
  requestedEndAt: dateString.optional(),
  acceptedRequirements: z.boolean().default(false),
  studentNotes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationCancellationRequestSchema = z.object({
  applicationId: z.string().min(1),
  reasonCategory: z.enum(["SCHEDULE_CONFLICT", "PERSONAL", "ELIGIBILITY", "CAPACITY", "PAYMENT", "HOSPITAL", "OTHER"]),
  note: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationAvailabilityMutationSchema = z.object({
  action: z.enum(["createWindow", "createBlackout", "deleteWindow", "deleteBlackout"]),
  hospitalId: z.string().min(1),
  id: z.preprocess(emptyToNull, z.string().nullable().optional()),
  availabilityWindowId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  startsAt: z.preprocess(emptyToNull, dateString.nullable().optional()),
  endsAt: z.preprocess(emptyToNull, dateString.nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional()),
  reason: z.preprocess(emptyToNull, z.string().max(1000).nullable().optional())
});

export const clinicalRotationOfferingMutationSchema = z.object({
  offeringId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  hospitalId: z.string().min(1, "יש לבחור בית חולים."),
  specialtyId: z.string().min(1, "יש לבחור תחום."),
  departmentId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  displayName: z.string().min(2, "יש להזין שם ציבורי לסבב.").max(180),
  startsAt: dateString,
  endsAt: dateString,
  minimumParticipants: z.coerce.number().int().min(1),
  maximumCapacity: z.preprocess(emptyToNull, z.coerce.number().int().min(1).nullable().optional()),
  minDurationWeeks: z.coerce.number().int().min(1).max(52).default(1),
  maxDurationWeeks: z.coerce.number().int().min(1).max(52).default(12),
  priceAmount: z.coerce.number().min(0),
  priceUnit: z.enum(clinicalRotationPriceUnitValues),
  paymentMethod: z.enum(clinicalRotationPaymentMethodValues),
  paymentLink: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  requirements: z.preprocess(emptyToNull, z.string().max(4000).nullable().optional()),
  cancellationPolicy: z.preprocess(emptyToNull, z.string().max(4000).nullable().optional()),
  workLanguage: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
  departmentContactName: z.preprocess(emptyToNull, z.string().max(160).nullable().optional()),
  departmentContactEmail: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  requiresDeanApproval: z.boolean().default(false),
  requiresInsurance: z.boolean().default(true),
  groupRegistrationEnabled: z.boolean().default(false),
  groupMinSize: z.preprocess(emptyToNull, z.coerce.number().int().min(2).nullable().optional()),
  groupMaxSize: z.preprocess(emptyToNull, z.coerce.number().int().min(2).nullable().optional()),
  isPreviewOnly: z.boolean().default(false),
  applicationBlockedReason: z.preprocess(emptyToNull, z.string().max(1000).nullable().optional()),
  studentInstructions: z.preprocess(emptyToNull, z.string().max(4000).nullable().optional()),
  internalNotes: z.preprocess(emptyToNull, z.string().max(4000).nullable().optional()),
  publish: z.boolean().default(false)
});

export const clinicalRotationOfferingStatusSchema = z.object({
  offeringId: z.string().min(1),
  action: z.enum(["publish", "pause", "close", "cancel"])
});

export const clinicalRotationApplicationActionSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["approve", "decline", "waitlist", "cancel", "complete", "approveCancellation", "rejectCancellation"]),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationPaymentActionSchema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["retryPaymentLink"]).optional(),
  status: z.enum(["PAID", "WAIVED", "OVERDUE"]).optional(),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
}).refine((value) => value.action === "retryPaymentLink" || Boolean(value.status), "יש לבחור פעולת תשלום.");

export const clinicalRotationAdminAccessSchema = z.object({
  action: z.enum(["inviteOrUpdate", "activate", "deactivate", "reset"]),
  accessId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  hospitalId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  fullName: z.preprocess(emptyToNull, z.string().min(2).max(160).nullable().optional()),
  isActive: z.boolean().default(true)
});

export const clinicalRotationCoreRuleSchema = z.object({
  coreSpecialty: z.enum(clinicalRotationCoreSpecialtyValues),
  specialtyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  maxWeeks: z.coerce.number().int().min(1).max(52),
  effectiveDate: dateString,
  enforcementMode: z.enum(clinicalRotationCoreRuleEnforcementModeValues).default("WARN"),
  isActive: z.boolean().default(true),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationAdminApplicationOverrideSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["approve", "decline", "waitlist", "cancel", "complete", "approveCancellation", "rejectCancellation"]),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationAdminPaymentOverrideSchema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["retryPaymentLink"]).optional(),
  status: z.enum(clinicalRotationPaymentStatusValues).optional().refine(
    (status) => !status || status === "PAID" || status === "WAIVED" || status === "OVERDUE",
    "סטטוס התשלום אינו ניתן לעדכון ידני כאן."
  ),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
}).refine((value) => value.action === "retryPaymentLink" || Boolean(value.status), "יש לבחור פעולת תשלום.");
