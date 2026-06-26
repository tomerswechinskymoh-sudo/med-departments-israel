import { getExperienceContributionEligibility } from "@/lib/onboarding-contribution";

type Scenario = {
  name: string;
  input: Parameters<typeof getExperienceContributionEligibility>[0];
  expectedEligible: boolean;
  expectedReviewerType: "STUDENT" | "INTERN" | "RESIDENT" | null;
  expectedCategory: "student" | "intern" | "resident_or_physician" | null;
};

const scenarios: Scenario[] = [
  {
    name: "early 6-year student year 4",
    input: { roleStatus: "medical_student", studentTrack: "six_year", studentYear: 4 },
    expectedEligible: false,
    expectedReviewerType: null,
    expectedCategory: null
  },
  {
    name: "clinical 6-year student year 5",
    input: { roleStatus: "medical_student", studentTrack: "six_year", studentYear: 5 },
    expectedEligible: true,
    expectedReviewerType: "STUDENT",
    expectedCategory: "student"
  },
  {
    name: "early 4-year student year 2",
    input: { roleStatus: "medical_student", studentTrack: "four_year", studentYear: 2 },
    expectedEligible: false,
    expectedReviewerType: null,
    expectedCategory: null
  },
  {
    name: "clinical 4-year student year 3",
    input: { roleStatus: "medical_student", studentTrack: "four_year", studentYear: 3 },
    expectedEligible: true,
    expectedReviewerType: "STUDENT",
    expectedCategory: "student"
  },
  {
    name: "intern",
    input: { roleStatus: "intern" },
    expectedEligible: true,
    expectedReviewerType: "INTERN",
    expectedCategory: "intern"
  },
  {
    name: "resident",
    input: { roleStatus: "resident" },
    expectedEligible: true,
    expectedReviewerType: "RESIDENT",
    expectedCategory: "resident_or_physician"
  },
  {
    name: "specialist",
    input: { roleStatus: "specialist" },
    expectedEligible: true,
    expectedReviewerType: "RESIDENT",
    expectedCategory: "resident_or_physician"
  },
  {
    name: "non-medical user",
    input: { roleStatus: "other" },
    expectedEligible: false,
    expectedReviewerType: null,
    expectedCategory: null
  }
];

const failures = scenarios.flatMap((scenario) => {
  const actual = getExperienceContributionEligibility(scenario.input);
  const mismatch =
    actual.eligible !== scenario.expectedEligible ||
    actual.reviewerType !== scenario.expectedReviewerType ||
    actual.category !== scenario.expectedCategory;

  return mismatch
    ? [
        {
          scenario: scenario.name,
          expected: {
            eligible: scenario.expectedEligible,
            reviewerType: scenario.expectedReviewerType,
            category: scenario.expectedCategory
          },
          actual
        }
      ]
    : [];
});

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.info(
  JSON.stringify(
    {
      ok: true,
      scenarios: scenarios.length,
      eligibleScenarios: scenarios.filter((scenario) => scenario.expectedEligible).length,
      skippedScenarios: scenarios.filter((scenario) => !scenario.expectedEligible).length
    },
    null,
    2
  )
);
