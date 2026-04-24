import { z } from "zod";

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

const scaleSchema = z.coerce.number().int().min(1).max(5);

export const loginSchema = z.object({
  email: z.string().email("יש להזין כתובת אימייל תקינה."),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים.")
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
    accountIntent: z.enum(["student", "resident"]).default("student")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "הסיסמאות אינן תואמות."
  });

export const departmentFilterSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().optional()),
  institutions: z.preprocess(queryStringArray, z.array(z.string()).optional()),
  specialties: z.preprocess(queryStringArray, z.array(z.string()).optional())
});

export const reviewSubmissionSchema = z
  .object({
    departmentId: z.string().min(1, "יש לבחור מחלקה."),
    reviewerType: z.enum(reviewerTypeValues),
    fullName: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
    phone: z.string().min(9, "יש להזין מספר טלפון לצורך אימות."),
    email: z.preprocess(emptyToUndefined, z.string().email("יש להזין אימייל תקין.").optional()),
    isAnonymous: z.boolean(),
    teachingQuality: scaleSchema,
    workAtmosphere: scaleSchema,
    seniorsApproachability: scaleSchema,
    researchExposure: scaleSchema,
    lifestyleBalance: scaleSchema,
    overallRecommendation: scaleSchema,
    pros: z.string().min(15, "יש לכתוב בקצרה מה עבד טוב בשבילך."),
    cons: z.string().min(15, "יש לכתוב מה פחות עבד או מה כדאי לדעת מראש."),
    tips: z.string().min(15, "יש להוסיף טיפ קצר למי שמגיע/ה אחריך."),
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
  title: z.string().min(2, "יש להזין תפקיד."),
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
  title: z.string().min(3, "יש להזין כותרת לתקן הפתוח."),
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
