export type SignupRoleStatus =
  | "medical_student"
  | "intern"
  | "resident"
  | "specialist"
  | "other";

export type StudentTrack = "six_year" | "four_year";
export type ExperienceContributionCategory = "student" | "intern" | "resident_or_physician";
export type ExperienceContributionReviewerType = "STUDENT" | "INTERN" | "RESIDENT";

export const SIGNUP_EXPERIENCE_TEXT_REQUIREMENT = "כחלק מההרשמה, יש לכתוב לפחות 20 תווים באחד משדות החוויה, האתגרים או הטיפים, על סמך התנסות אמיתית וללא פרטים מזהים של מטופלים.";

export function hasSignupExperienceText(input: { pros?: string; cons?: string; tips?: string }) {
  return [input.pros, input.cons, input.tips].some((text) => (text?.trim().length ?? 0) >= 20);
}

export type ExperienceContributionEligibilityInput = {
  roleStatus: SignupRoleStatus;
  studentTrack?: StudentTrack | "";
  studentYear?: number | string | null;
};

export type ExperienceContributionEligibility = {
  eligible: boolean;
  category: ExperienceContributionCategory | null;
  reviewerType: ExperienceContributionReviewerType | null;
  reason: string;
};

function numericStudentYear(value: ExperienceContributionEligibilityInput["studentYear"]) {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : null;
}

export function getExperienceContributionEligibility(
  input: ExperienceContributionEligibilityInput
): ExperienceContributionEligibility {
  if (input.roleStatus === "intern") {
    return {
      eligible: true,
      category: "intern",
      reviewerType: "INTERN",
      reason: "intern"
    };
  }

  if (input.roleStatus === "resident") {
    return {
      eligible: true,
      category: "resident_or_physician",
      reviewerType: "RESIDENT",
      reason: input.roleStatus
    };
  }

  if (input.roleStatus !== "medical_student") {
    return {
      eligible: false,
      category: null,
      reviewerType: null,
      reason: input.roleStatus === "specialist" ? "specialist_exempt" : "non_medical"
    };
  }

  const year = numericStudentYear(input.studentYear);

  if (input.studentTrack === "six_year" && year !== null && year >= 4 && year <= 7) {
    return {
      eligible: true,
      category: "student",
      reviewerType: "STUDENT",
      reason: "six_year_clinical"
    };
  }

  if (input.studentTrack === "four_year" && year !== null && year >= 3 && year <= 7) {
    return {
      eligible: true,
      category: "student",
      reviewerType: "STUDENT",
      reason: "four_year_clinical"
    };
  }

  return {
    eligible: false,
    category: null,
    reviewerType: null,
    reason: "early_medical_student"
  };
}
