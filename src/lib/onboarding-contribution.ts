export type SignupRoleStatus =
  | "medical_student"
  | "intern"
  | "resident"
  | "specialist"
  | "other";

export type StudentTrack = "six_year" | "four_year";
export type ExperienceContributionCategory = "student" | "intern" | "resident_or_physician";
export type ExperienceContributionReviewerType = "STUDENT" | "INTERN" | "RESIDENT";

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

  if (input.roleStatus === "resident" || input.roleStatus === "specialist") {
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
      reason: "non_medical"
    };
  }

  const year = numericStudentYear(input.studentYear);

  if (input.studentTrack === "six_year" && year !== null && year >= 5) {
    return {
      eligible: true,
      category: "student",
      reviewerType: "STUDENT",
      reason: "six_year_clinical"
    };
  }

  if (input.studentTrack === "four_year" && year !== null && year >= 3) {
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
