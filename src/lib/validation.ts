import { z } from "zod";
import { MAINLY_TAUGHT_BY_OPTIONS, MEDICAL_FACULTY_OPTIONS } from "@/lib/constants";

export const reviewerTypeValues = ["RESIDENT", "INTERN", "STUDENT"] as const;
export const submissionStatusValues = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "PUBLISHED"
] as const;
export const contentStatusValues = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export const publisherRequestStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;
export const roleKeyValues = ["STUDENT", "RESIDENT", "REPRESENTATIVE", "ADMIN"] as const;
export const opportunityStatusValues = ["OPEN", "UPCOMING", "CLOSED"] as const;
export const openingTypeValues = [
  "RESIDENCY",
  "FELLOWSHIP",
  "ACADEMIC_TRACK",
  "COMMUNITY_TRACK",
  "OTHER"
] as const;
export const openingApplicationStatusValues = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CONTACTED",
  "ARCHIVED"
] as const;
export const electiveAvailabilityModeValues = ["OPEN_BY_DEFAULT", "CLOSED_BY_DEFAULT"] as const;
export const electiveWindowStatusValues = ["OPEN", "CLOSED"] as const;
export const electiveApplicationStatusValues = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "ARCHIVED"
] as const;
export const fellowshipExperienceVisibilityValues = [
  "ADMIN_ONLY",
  "PUBLIC_ANONYMIZED",
  "PUBLIC_IDENTIFIED"
] as const;
export const professionalRoleStatusValues = ["medical_student", "intern", "resident", "specialist", "other"] as const;

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const trimString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

const queryStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : undefined;
  }

  return undefined;
};

const queryBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "on") {
      return true;
    }

    if (normalized === "0" || normalized === "false" || normalized === "") {
      return false;
    }
  }

  return false;
};

const queryScaleValue = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return undefined;
};

const scaleSchema = z.coerce.number().int().min(1).max(5);
const parseJsonString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
const medicalFacultyValues = MEDICAL_FACULTY_OPTIONS;
const mainlyTaughtByValues = MAINLY_TAUGHT_BY_OPTIONS.map((option) => option.value) as [
  (typeof MAINLY_TAUGHT_BY_OPTIONS)[number]["value"],
  ...(typeof MAINLY_TAUGHT_BY_OPTIONS)[number]["value"][]
];

export const loginSchema = z.object({
  email: z.string().email("יש להזין כתובת אימייל תקינה."),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים.")
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("יש להזין כתובת אימייל תקינה.")
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16, "קישור האיפוס אינו תקין."),
    password: z
      .string()
      .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים.")
      .regex(/[A-Z]/, "יש לכלול אות גדולה אחת לפחות.")
      .regex(/[a-z]/, "יש לכלול אות קטנה אחת לפחות.")
      .regex(/[0-9]/, "יש לכלול ספרה אחת לפחות."),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "הסיסמאות אינן תואמות."
  });

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "יש להזין שם מלא."),
    email: z.string().email("יש להזין כתובת אימייל תקינה."),
    phone: z.preprocess(emptyToUndefined, z.string().min(9).optional()),
    password: z
      .string()
      .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים.")
      .regex(/[A-Z]/, "יש לכלול אות גדולה אחת לפחות.")
      .regex(/[a-z]/, "יש לכלול אות קטנה אחת לפחות.")
      .regex(/[0-9]/, "יש לכלול ספרה אחת לפחות."),
    confirmPassword: z.string(),
    roleStatus: z.enum(professionalRoleStatusValues, {
      errorMap: () => ({ message: "יש לבחור סטטוס מקצועי." })
    }),
    proofConfirmed: z.literal(true, {
      errorMap: () => ({ message: "יש לאשר שהמסמך נכון ומשמש לצורכי אימות בלבד." })
    }),
    marketingConsent: z.boolean().default(false),
    privacyVerificationConsent: z.literal(true, {
      errorMap: () => ({ message: "יש לאשר את תנאי השימוש, מדיניות הפרטיות ושמירת המידע לצורכי אימות." })
    }),
    studentTrack: z.preprocess(emptyToUndefined, z.enum(["six_year", "four_year"]).optional()),
    studentYear: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(7).optional()),
    medicalFaculty: z.preprocess(emptyToUndefined, z.enum(medicalFacultyValues).optional()),
    onboardingInstitutionId: z.preprocess(emptyToUndefined, z.string().optional()),
    onboardingDepartmentId: z.preprocess(emptyToUndefined, z.string().optional()),
    experienceContributionStatus: z.preprocess(
      emptyToUndefined,
      z.enum(["not_eligible", "prompted", "submitted", "skipped"]).optional()
    ),
    experienceContributionCategory: z.preprocess(
      emptyToUndefined,
      z.enum(["student", "intern", "resident_or_physician"]).optional()
    )
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "הסיסמאות אינן תואמות."
  });

export const departmentFilterSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().optional()),
  institutions: z.preprocess(queryStringArray, z.array(z.string()).optional()),
  specialties: z.preprocess(queryStringArray, z.array(z.string()).optional()),
  regions: z.preprocess(queryStringArray, z.array(z.string()).optional()),
  institutionTypes: z.preprocess(queryStringArray, z.array(z.enum(["HOSPITAL", "HMO"])).optional()),
  hasOpenPositions: z.preprocess(queryBoolean, z.boolean().default(false)),
  hasResearch: z.preprocess(queryBoolean, z.boolean().default(false)),
  hasReviews: z.preprocess(queryBoolean, z.boolean().default(false)),
  sort: z
    .preprocess(emptyToUndefined, z.enum(["recommended", "rating", "reviews", "openings", "research"]).optional())
    .default("recommended"),
  prioritizeOpenings: z.preprocess(queryBoolean, z.boolean().default(false)),
  prioritizeCommittee: z.preprocess(queryBoolean, z.boolean().default(false)),
  researchPriority: z.preprocess(queryScaleValue, scaleSchema.optional()),
  electivePriority: z.preprocess(queryScaleValue, scaleSchema.optional()),
  lifestylePriority: z.preprocess(queryScaleValue, scaleSchema.optional()),
  teachingPriority: z.preprocess(queryScaleValue, scaleSchema.optional()),
  seniorsPriority: z.preprocess(queryScaleValue, scaleSchema.optional()),
  clinicalPriority: z.preprocess(queryScaleValue, scaleSchema.optional())
});

const reviewRoleDetailsSchema = z.object({
  medicalSchool: z.enum(medicalFacultyValues, {
    errorMap: () => ({ message: "יש לבחור פקולטה לרפואה." })
  }),
  overallRating: scaleSchema,
  researchEncouragement: scaleSchema,
  mainlyTaughtBy: z.enum(mainlyTaughtByValues, {
    errorMap: () => ({ message: "יש לבחור מי הוביל את הלמידה בפועל." })
  }),
  clinicalExposure: scaleSchema,
  fitForWho: z.preprocess(emptyToUndefined, z.string().optional()),
  studentTrack: z.preprocess(emptyToUndefined, z.enum(["six_year", "four_year"]).optional()),
  studentYear: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(7).optional()),
  rotationLength: z.preprocess(emptyToUndefined, z.string().optional()),
  durationWeeks: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1, "יש להזין מספר שבועות תקין.").max(52).optional()
  ),
  yearOfExperience: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^20\d{2}$/, "יש לבחור שנה קלנדרית תקינה.")
      .optional()
  ),
  attitudeFromResidents: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  attitudeFromSeniors: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  workloadBalance: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  residentCurrentStatus: z.preprocess(emptyToUndefined, z.enum(["active", "completed"]).optional()),
  residencyCompletedTiming: z.preprocess(
    emptyToUndefined,
    z.enum(["last_3_years", "3_to_5_years", "more_than_5_years"]).optional()
  ),
  departmentElectiveImportance: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  departmentObservationImportance: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  outsideShiftsImportance: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  researchImportance: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  medicalSchoolInfluence: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  departmentHeadInfluence: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  seniorDecisionInfluence: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  wholeDepartmentSelectionInfluence: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  hasAdmissionCommittee: z.preprocess(emptyToUndefined, z.enum(["yes", "no", "unknown"]).optional()),
  monthlyDutyRange: z.preprocess(emptyToUndefined, z.string().optional()),
  parentPositionAvailable: z.preprocess(emptyToUndefined, z.enum(["yes", "no", "unknown"]).optional()),
  averageArrivalTime: z.preprocess(emptyToUndefined, z.string().optional()),
  personalNeedsConsideration: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  teamwork: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  belonging: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  stageAVacation: z.preprocess(emptyToUndefined, z.enum(["yes", "no", "partial", "unknown"]).optional()),
  stageBVacation: z.preprocess(emptyToUndefined, z.enum(["yes", "no", "partial", "unknown"]).optional()),
  conferenceFunding: z.preprocess(emptyToUndefined, z.enum(["yes", "no", "partial", "unknown"]).optional()),
  surgicalAutonomy: z.preprocess(emptyToUndefined, scaleSchema.optional()),
  contributionCategory: z.preprocess(
    emptyToUndefined,
    z.enum(["student", "intern", "resident_or_physician"]).optional()
  )
});

export const reviewSubmissionSchema = z
  .object({
    departmentId: z.string().min(1, "יש לבחור מחלקה."),
    reviewerType: z.enum(reviewerTypeValues),
    fullName: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
    phone: z.preprocess(emptyToUndefined, z.string().min(9, "יש להזין מספר טלפון תקין.").optional()),
    email: z.preprocess(emptyToUndefined, z.string().email("יש להזין אימייל תקין.").optional()),
    hasVerificationDocument: z.boolean().default(false),
    isAnonymous: z.boolean(),
    teachingQuality: scaleSchema,
    workAtmosphere: scaleSchema,
    seniorsApproachability: scaleSchema,
    researchExposure: scaleSchema,
    lifestyleBalance: scaleSchema,
    overallRecommendation: scaleSchema,
    pros: z.preprocess(emptyToUndefined, z.string().max(1500, "הטקסט ארוך מדי.").optional()),
    cons: z.preprocess(emptyToUndefined, z.string().max(1500, "הטקסט ארוך מדי.").optional()),
    tips: z.preprocess(emptyToUndefined, z.string().max(1500, "הטקסט ארוך מדי.").optional()),
    roleDetails: z.preprocess(parseJsonString, reviewRoleDetailsSchema),
    consentToContact: z.literal(true, {
      errorMap: () => ({ message: "צריך לאשר יצירת קשר לצורך אימות." })
    }),
    consentToTerms: z.literal(true, {
      errorMap: () => ({ message: "צריך לאשר שהשיתוף נשלח לבדיקה לפני פרסום." })
    }),
    consentNoPatientInfo: z.literal(true, {
      errorMap: () => ({ message: "צריך לאשר שאין בטקסט מידע מזהה על מטופלים." })
    })
  })
  .superRefine((data, ctx) => {
    if (!data.isAnonymous && !data.fullName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "אם בחרת לפרסם בשם, צריך למלא שם מלא."
      });
    }

    if (data.reviewerType === "STUDENT") {
      if (!data.roleDetails.rotationLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "rotationLength"],
          message: "יש לבחור את אורך הסבב / האלקטיב."
        });
      }

      if (!data.roleDetails.yearOfExperience) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "yearOfExperience"],
          message: "יש לבחור באיזו שנה זה התרחש."
        });
      }
    }

    if (data.reviewerType === "INTERN") {
      if (!data.roleDetails.durationWeeks) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "durationWeeks"],
          message: "יש להזין כמה שבועות היית במחלקה."
        });
      }

      if (!data.roleDetails.yearOfExperience) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "yearOfExperience"],
          message: "יש לבחור מתי היה הסבב או האלקטיב."
        });
      }

      if (!data.roleDetails.attitudeFromResidents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "attitudeFromResidents"],
          message: "יש לדרג את היחס מהמתמחים."
        });
      }

      if (!data.roleDetails.attitudeFromSeniors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "attitudeFromSeniors"],
          message: "יש לדרג את היחס מהבכירים."
        });
      }

      if (!data.roleDetails.workloadBalance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "workloadBalance"],
          message: "יש לדרג את העומס והאיזון."
        });
      }
    }

    if (data.reviewerType === "RESIDENT") {
      if (!data.roleDetails.residentCurrentStatus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "residentCurrentStatus"],
          message: "יש לבחור מצב נוכחי."
        });
      }

      if (data.roleDetails.residentCurrentStatus === "completed" && !data.roleDetails.residencyCompletedTiming) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "residencyCompletedTiming"],
          message: "יש לבחור מתי סיימת התמחות."
        });
      }

      if (!data.roleDetails.attitudeFromResidents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "attitudeFromResidents"],
          message: "יש לדרג את היחס מהמתמחים."
        });
      }

      if (!data.roleDetails.attitudeFromSeniors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "attitudeFromSeniors"],
          message: "יש לדרג את היחס מהבכירים."
        });
      }

      if (!data.roleDetails.workloadBalance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleDetails", "workloadBalance"],
          message: "יש לדרג את העומס והאיזון."
        });
      }
    }
  });

export const reportReviewSchema = z.object({
  reason: z.string().min(5, "יש לציין סיבה."),
  details: z.preprocess(emptyToUndefined, z.string().max(500).optional())
});

export const publisherRequestSchema = z
  .object({
    institutionId: z.preprocess(emptyToUndefined, z.string().optional()),
    departmentId: z.preprocess(emptyToUndefined, z.string().optional()),
    note: z.preprocess(emptyToUndefined, z.string().max(700).optional())
  })
  .superRefine((data, ctx) => {
    if (!data.institutionId && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "יש לבחור מחלקה או מוסד עבור בקשת הפרסום."
      });
    }
  });

export const publisherRequestModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.preprocess(emptyToUndefined, z.string().max(600).optional())
});

export const reviewSubmissionModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.preprocess(emptyToUndefined, z.string().max(600).optional())
});

export const userVerificationModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.preprocess(emptyToUndefined, z.string().max(600).optional())
});

export const openingApplicationModerationSchema = z.object({
  status: z.enum(openingApplicationStatusValues),
  reviewerNote: z.preprocess(emptyToUndefined, z.string().max(800).optional())
});

export const representativeProfileSchema = z.object({
  title: z.preprocess(emptyToUndefined, z.string().min(2, "יש להזין תפקיד / טייטל.").optional()),
  contactDetails: z.preprocess(
    emptyToUndefined,
    z.string().max(500, "יש לקצר את פרטי הקשר.").optional()
  ),
  note: z.preprocess(emptyToUndefined, z.string().max(700, "יש לקצר את ההערה.").optional())
});

export const representativeAccountProfileSchema = z.object({
  fullName: z.string().min(2, "יש להזין שם מלא."),
  email: z.string().email("יש להזין אימייל תקין."),
  phone: z.preprocess(emptyToUndefined, z.string().min(9, "יש להזין טלפון תקין.").optional()),
  profile: representativeProfileSchema
});

export const adminRepresentativeCreateSchema = z.object({
  fullName: z.string().min(2, "יש להזין שם מלא."),
  email: z.string().email("יש להזין אימייל תקין."),
  phone: z.preprocess(emptyToUndefined, z.string().min(9).optional()),
  password: z
    .string()
    .min(8, "יש להזין סיסמה זמנית של לפחות 8 תווים.")
      .regex(/[A-Z]/, "יש לכלול אות גדולה אחת לפחות.")
      .regex(/[a-z]/, "יש לכלול אות קטנה אחת לפחות.")
      .regex(/[0-9]/, "יש לכלול ספרה אחת לפחות."),
  institutionId: z.string().min(1, "יש לבחור מוסד."),
  departmentIds: z.array(z.string().min(1)).min(1, "יש לשייך לפחות מחלקה אחת."),
  profile: representativeProfileSchema
});

export const representativeAssignmentUpdateSchema = z.object({
  institutionId: z.string().min(1, "יש לבחור מוסד."),
  departmentIds: z.array(z.string().min(1))
});

export const openingContentReviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.preprocess(emptyToUndefined, z.string().max(800).optional())
});

export const departmentChangeReviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.preprocess(emptyToUndefined, z.string().max(800).optional())
});

export const departmentHeadSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  name: z.string().min(2, "יש להזין שם."),
  title: z.string().min(1, "יש להזין תואר."),
  role: z.preprocess(emptyToUndefined, z.string().max(120, "יש לקצר את התפקיד.").optional()),
  bio: z.string().min(10, "יש להזין ביוגרפיה קצרה."),
  profileImageUrl: z.preprocess(emptyToUndefined, z.string().url().optional())
});

export const officialUpdateSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  title: z.string().min(3, "יש להזין כותרת."),
  body: z.string().min(10, "יש להזין תוכן.")
});

export const researchOpportunitySchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  title: z.string().min(3, "יש להזין כותרת."),
  summary: z.string().min(10, "יש להזין תקציר."),
  description: z.string().min(20, "יש להזין תיאור."),
  contactInfo: z.preprocess(emptyToUndefined, z.string().max(300).optional())
});

export const departmentEditorSchema = z.object({
  departmentId: z.string().min(1),
  shortSummary: z.string().min(20, "יש להזין תקציר קצר."),
  about: z.string().min(80, "יש להזין תיאור מלא."),
  practicalInfo: z.string().min(40, "יש להזין מידע פרקטי לסטודנטים/סטאז'רים."),
  publicContactEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
  publicContactPhone: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
  heads: z.array(departmentHeadSchema).min(1, "יש להזין לפחות ראש מחלקה אחד."),
  officialUpdates: z.array(officialUpdateSchema).max(6),
  researchOpportunities: z.array(researchOpportunitySchema).max(6)
});

export const openingAcceptanceCriteriaSchema = z.object({
  researchImportance: scaleSchema,
  departmentElectiveImportance: scaleSchema,
  departmentInternshipImportance: scaleSchema,
  residentSelectionInfluence: scaleSchema,
  specialistSelectionInfluence: scaleSchema,
  departmentHeadInfluence: scaleSchema,
  medicalSchoolInfluence: scaleSchema,
  recommendationsImportance: scaleSchema,
  personalFitImportance: scaleSchema,
  previousDepartmentExperienceImportance: scaleSchema,
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  whatWeAreLookingFor: z.preprocess(emptyToUndefined, z.string().max(700).optional())
});

export const openingEditorSchema = z.object({
  departmentId: z.string().min(1, "יש לבחור מחלקה."),
  title: z.string().min(3, "יש להזין כותרת למשרה הפתוחה."),
  summary: z.string().min(20, "יש להזין תקציר."),
  openingType: z.enum(openingTypeValues),
  isImmediate: z.boolean().default(false),
  openingsCount: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(20).optional()),
  topApplicantsToEmail: z.coerce.number().int().min(1).max(20).default(5),
  status: z.enum(opportunityStatusValues),
  committeeDate: z.preprocess(emptyToUndefined, z.string().optional()),
  applicationDeadline: z.preprocess(emptyToUndefined, z.string().optional()),
  expectedStartDate: z.preprocess(emptyToUndefined, z.string().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(1200).optional()),
  supportingInfo: z.preprocess(emptyToUndefined, z.string().max(1200).optional()),
  acceptanceCriteria: openingAcceptanceCriteriaSchema
});

export const openingApplicationSchema = z
  .object({
    openingId: z.string().min(1),
    applicantType: z.enum(reviewerTypeValues),
    fullName: z.preprocess(trimString, z.string().min(2, "יש להזין שם מלא.")),
    phone: z.preprocess(trimString, z.string().min(9, "יש להזין מספר טלפון.")),
    email: z.preprocess(emptyToUndefined, z.string().email("יש להזין אימייל תקין.").optional()),
    medicalSchool: z.preprocess(trimString, z.string().min(2, "יש להזין מוסד לימודים.")),
    didDepartmentElective: z.boolean(),
    departmentElectiveDetails: z.preprocess(emptyToUndefined, z.string().max(800).optional()),
    hasResearch: z.boolean(),
    researchDetails: z.preprocess(emptyToUndefined, z.string().max(800).optional()),
    didInternshipThere: z.boolean(),
    internshipDetails: z.preprocess(emptyToUndefined, z.string().max(800).optional()),
    recommendationDetails: z.preprocess(emptyToUndefined, z.string().max(800).optional()),
    departmentFamiliarityDetails: z.preprocess(emptyToUndefined, z.string().max(800).optional()),
    motivationText: z.preprocess(
      trimString,
      z.string().min(15, "יש לכתוב בקצרה למה המחלקה מעניינת אותך.")
    ),
    relevantExperience: z.preprocess(
      trimString,
      z.string().min(12, "יש לתאר בקצרה ניסיון רלוונטי.")
    ),
    additionalNotes: z.preprocess(emptyToUndefined, z.string().max(1200).optional())
  })
  .superRefine((data, ctx) => {
    if (data.didDepartmentElective && !data.departmentElectiveDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentElectiveDetails"],
        message: "אם עשית אלקטיב במחלקה, כדאי לפרט עליו בקצרה."
      });
    }

    if (data.hasResearch && !data.researchDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["researchDetails"],
        message: "אם יש מחקרים, יש לפרט עליהם בקצרה."
      });
    }

    if (data.didInternshipThere && !data.internshipDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["internshipDetails"],
        message: "אם היית בסטאז' במחלקה, יש להוסיף כמה מילים."
      });
    }
  });

export const electiveDepartmentAccountSchema = z.object({
  departmentId: z.string().min(1, "יש לבחור מחלקה."),
  username: z.string().min(3, "יש להזין שם משתמש באורך 3 תווים לפחות.").max(80),
  password: z.string().min(8, "יש להזין סיסמה של לפחות 8 תווים."),
  isActive: z.boolean().default(true)
});

export const electiveDepartmentSettingsSchema = z.object({
  departmentId: z.string().min(1, "יש לבחור מחלקה."),
  maxStudentsAtOnce: z.coerce.number().int().min(1, "המינימום הוא סטודנט אחד.").max(50),
  availabilityMode: z.enum(electiveAvailabilityModeValues),
  contactEmail: z.preprocess(emptyToUndefined, z.string().email("יש להזין אימייל תקין.").optional()),
  contactPhone: z.preprocess(emptyToUndefined, z.string().min(7, "יש להזין טלפון תקין.").optional()),
  instructions: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  adminNotes: z.preprocess(emptyToUndefined, z.string().max(2000).optional())
});

export const electiveAvailabilityWindowSchema = z
  .object({
    departmentId: z.string().min(1, "יש לבחור מחלקה."),
    status: z.enum(electiveWindowStatusValues),
    startsAt: z.string().min(1, "יש להזין תאריך התחלה."),
    endsAt: z.string().min(1, "יש להזין תאריך סיום."),
    note: z.preprocess(emptyToUndefined, z.string().max(1000).optional())
  })
  .refine((data) => new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime(), {
    path: ["endsAt"],
    message: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה."
  });

export const electiveApplicationAdminSchema = z.object({
  departmentId: z.string().min(1, "יש לבחור מחלקה."),
  applicantName: z.string().min(2, "יש להזין שם."),
  applicantEmail: z.string().email("יש להזין אימייל תקין."),
  applicantPhone: z.preprocess(emptyToUndefined, z.string().min(7).optional()),
  medicalSchool: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  requestedStartDate: z.preprocess(emptyToUndefined, z.string().optional()),
  requestedEndDate: z.preprocess(emptyToUndefined, z.string().optional()),
  status: z.enum(electiveApplicationStatusValues).default("SUBMITTED"),
  studentNotes: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  adminNotes: z.preprocess(emptyToUndefined, z.string().max(2000).optional())
});

export const fellowshipSpecialtySchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  baseSpecialtyId: z.preprocess(emptyToUndefined, z.string().optional()),
  slug: z
    .string()
    .min(2, "יש להזין מזהה קצר.")
    .regex(/^[a-z0-9-]+$/, "המזהה צריך להכיל אותיות לטיניות קטנות, מספרים ומקפים בלבד."),
  nameHe: z.string().min(2, "יש להזין שם בעברית."),
  nameEn: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(3000).optional()),
  beforeContent: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  duringContent: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  afterContent: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  isPublished: z.boolean().default(false)
});

export const fellowshipProgramSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  fellowshipSpecialtyId: z.string().min(1, "יש לבחור תחום פלושיפ."),
  baseSpecialtyId: z.preprocess(emptyToUndefined, z.string().optional()),
  country: z.string().min(2, "יש להזין מדינה."),
  city: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  institution: z.string().min(2, "יש להזין מוסד."),
  departmentName: z.preprocess(emptyToUndefined, z.string().max(180).optional()),
  duration: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  requirements: z.preprocess(emptyToUndefined, z.string().max(3000).optional()),
  contactName: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  contactEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
  contactPhone: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  websiteUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(3000).optional()),
  isPublished: z.boolean().default(false)
});

export const fellowshipIsraeliExperienceSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  fellowshipProgramId: z.preprocess(emptyToUndefined, z.string().optional()),
  fellowshipSpecialtyId: z.preprocess(emptyToUndefined, z.string().optional()),
  physicianName: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  roleTitle: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  currentInstitution: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  contactEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
  contactPhone: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  experienceText: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
  visibility: z.enum(fellowshipExperienceVisibilityValues).default("ADMIN_ONLY"),
  notes: z.preprocess(emptyToUndefined, z.string().max(3000).optional()),
  isPublished: z.boolean().default(false)
});

export const adminInstitutionSchema = z.object({
  name: z.string().min(2, "יש להזין שם מוסד."),
  slug: z
    .string()
    .min(2, "יש להזין מזהה קצר.")
    .regex(/^[a-z0-9-]+$/, "המזהה צריך להכיל אותיות לטיניות קטנות, מספרים ומקפים בלבד."),
  type: z.enum(["HOSPITAL", "HMO"]),
  city: z.preprocess(emptyToUndefined, z.string().optional()),
  summary: z.string().min(20, "יש להזין תקציר."),
  websiteUrl: z.preprocess(emptyToUndefined, z.string().url().optional())
});

export const adminSpecialtySchema = z.object({
  name: z.string().min(2, "יש להזין שם תחום."),
  slug: z
    .string()
    .min(2, "יש להזין מזהה קצר.")
    .regex(/^[a-z0-9-]+$/, "המזהה צריך להכיל אותיות לטיניות קטנות, מספרים ומקפים בלבד."),
  description: z.string().min(20, "יש להזין תיאור.")
});

export const adminDepartmentSchema = z.object({
  institutionId: z.string().min(1, "יש לבחור מוסד."),
  specialtyId: z.string().min(1, "יש לבחור תחום."),
  name: z.string().min(2, "יש להזין שם מחלקה."),
  slug: z
    .string()
    .min(2, "יש להזין מזהה קצר.")
    .regex(/^[a-z0-9-]+$/, "המזהה צריך להכיל אותיות לטיניות קטנות, מספרים ומקפים בלבד."),
  shortSummary: z.string().min(20, "יש להזין תקציר קצר."),
  about: z.string().min(80, "יש להזין תיאור מלא."),
  practicalInfo: z.string().min(40, "יש להזין מידע פרקטי."),
  publicContactEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
  publicContactPhone: z.preprocess(emptyToUndefined, z.string().min(8).optional())
});

export const adminUserRoleSchema = z.object({
  role: z.enum(["STUDENT", "RESIDENT", "ADMIN"])
});
