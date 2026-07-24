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
  studentNotes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
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
  priceAmount: z.coerce.number().min(0),
  priceUnit: z.enum(clinicalRotationPriceUnitValues),
  paymentMethod: z.enum(clinicalRotationPaymentMethodValues),
  paymentLink: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  studentInstructions: z.preprocess(emptyToNull, z.string().max(4000).nullable().optional()),
  internalNotes: z.preprocess(emptyToNull, z.string().max(4000).nullable().optional()),
  publish: z.boolean().default(false)
});

export const clinicalRotationOfferingStatusSchema = z.object({
  offeringId: z.string().min(1),
  action: z.enum(["publish", "pause", "close"])
});

export const clinicalRotationApplicationActionSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["approve", "decline", "cancel", "complete"]),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationPaymentActionSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["PAID", "WAIVED", "OVERDUE"]),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

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
  action: z.enum(["approve", "decline", "cancel", "complete"]),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});

export const clinicalRotationAdminPaymentOverrideSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(clinicalRotationPaymentStatusValues).refine(
    (status) => status === "PAID" || status === "WAIVED" || status === "OVERDUE",
    "סטטוס התשלום אינו ניתן לעדכון ידני כאן."
  ),
  notes: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional())
});
