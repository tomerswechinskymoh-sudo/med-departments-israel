import { ReviewSourceType, UploadedFileCategory } from "@prisma/client";
import { z } from "zod";

const openAiMatchSchema = z.object({
  match_score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().min(2).max(180)).max(4).default([]),
  concerns: z.array(z.string().min(2).max(180)).max(4).default([]),
  short_summary: z.string().min(10).max(320)
});

type MatchableOpening = {
  id: string;
  title: string;
  summary: string;
  notes?: string | null;
  supportingInfo?: string | null;
  department: {
    name: string;
    specialty: {
      name: string;
    };
    institution: {
      name: string;
    };
  };
  acceptanceCriteria: {
    researchImportance: number;
    departmentElectiveImportance: number;
    departmentInternshipImportance: number;
    residentSelectionInfluence: number;
    specialistSelectionInfluence: number;
    departmentHeadInfluence: number;
    medicalSchoolInfluence: number;
    recommendationsImportance: number;
    personalFitImportance: number;
    previousDepartmentExperienceImportance: number;
    notes?: string | null;
    whatWeAreLookingFor?: string | null;
  } | null;
};

type MatchableApplication = {
  id: string;
  applicantType: ReviewSourceType;
  fullName: string;
  email?: string | null;
  phone: string;
  medicalSchool?: string | null;
  didDepartmentElective: boolean;
  departmentElectiveDetails?: string | null;
  hasResearch: boolean;
  researchDetails?: string | null;
  didInternshipThere: boolean;
  internshipDetails?: string | null;
  recommendationDetails?: string | null;
  departmentFamiliarityDetails?: string | null;
  motivationText: string;
  relevantExperience: string;
  additionalNotes?: string | null;
  files?: Array<{
    category: UploadedFileCategory;
    originalName: string;
  }>;
};

type MatchingResult = {
  score: number;
  strengths: string[];
  concerns: string[];
  shortSummary: string;
  engine: "OPENAI" | "FALLBACK";
  evaluationError?: string | null;
};

function getMatchModel() {
  return process.env.OPENAI_MATCH_MODEL?.trim() || "gpt-4o-mini";
}

function buildMatchingPayload(opening: MatchableOpening, application: MatchableApplication) {
  const fileNames = application.files?.map((file) => file.originalName) ?? [];

  return {
    opening: {
      title: opening.title,
      summary: opening.summary,
      institution: opening.department.institution.name,
      department: opening.department.name,
      specialty: opening.department.specialty.name,
      notes: opening.notes ?? null,
      supporting_info: opening.supportingInfo ?? null,
      acceptance_criteria: opening.acceptanceCriteria
    },
    applicant: {
      applicant_type: application.applicantType,
      medical_school: application.medicalSchool ?? null,
      did_department_elective: application.didDepartmentElective,
      department_elective_details: application.departmentElectiveDetails ?? null,
      did_internship_there: application.didInternshipThere,
      internship_details: application.internshipDetails ?? null,
      has_research: application.hasResearch,
      research_details: application.researchDetails ?? null,
      recommendation_details: application.recommendationDetails ?? null,
      department_familiarity_details: application.departmentFamiliarityDetails ?? null,
      relevant_experience: application.relevantExperience,
      motivation_text: application.motivationText,
      additional_notes: application.additionalNotes ?? null,
      has_cv_file: fileNames.length > 0,
      uploaded_file_names: fileNames
    }
  };
}

function coverageSignal(text?: string | null) {
  const length = text?.trim().length ?? 0;

  if (length >= 220) {
    return 1;
  }

  if (length >= 120) {
    return 0.82;
  }

  if (length >= 60) {
    return 0.62;
  }

  if (length >= 20) {
    return 0.4;
  }

  return 0;
}

function fallbackMatch(opening: MatchableOpening, application: MatchableApplication, error?: string) {
  const criteria = opening.acceptanceCriteria ?? {
    researchImportance: 3,
    departmentElectiveImportance: 3,
    departmentInternshipImportance: 3,
    residentSelectionInfluence: 3,
    specialistSelectionInfluence: 3,
    departmentHeadInfluence: 3,
    medicalSchoolInfluence: 3,
    recommendationsImportance: 3,
    personalFitImportance: 3,
    previousDepartmentExperienceImportance: 3,
    notes: null,
    whatWeAreLookingFor: null
  };

  const departmentFamiliaritySignal = Math.max(
    application.didDepartmentElective ? 1 : 0,
    application.didInternshipThere ? 1 : 0,
    application.departmentFamiliarityDetails ? 0.7 : 0
  );
  const recommendationSignal = application.recommendationDetails ? 1 : 0;
  const researchSignal = application.hasResearch ? 1 : coverageSignal(application.researchDetails);
  const experienceSignal = Math.max(
    coverageSignal(application.relevantExperience),
    coverageSignal(application.motivationText)
  );
  const personalFitSignal = Math.min(
    1,
    coverageSignal(application.motivationText) * 0.65 + coverageSignal(application.additionalNotes) * 0.35
  );

  const weightedSignals = [
    { label: "מחקר", weight: criteria.researchImportance, signal: researchSignal },
    {
      label: "אלקטיב במחלקה",
      weight: criteria.departmentElectiveImportance,
      signal: application.didDepartmentElective ? 1 : 0
    },
    {
      label: "סטאז' או סבב במחלקה",
      weight: criteria.departmentInternshipImportance,
      signal: application.didInternshipThere ? 1 : 0
    },
    {
      label: "היכרות קודמת עם המחלקה",
      weight: criteria.previousDepartmentExperienceImportance,
      signal: departmentFamiliaritySignal
    },
    {
      label: "התאמה אישית",
      weight: criteria.personalFitImportance,
      signal: personalFitSignal
    },
    {
      label: "מוסד לימודים",
      weight: criteria.medicalSchoolInfluence,
      signal: application.medicalSchool ? 0.82 : 0.25
    },
    {
      label: "המלצות",
      weight: criteria.recommendationsImportance,
      signal: recommendationSignal
    },
    {
      label: "רושם כללי לצוות מתמחים",
      weight: criteria.residentSelectionInfluence,
      signal: experienceSignal
    },
    {
      label: "רושם מקצועי לצוות בכיר",
      weight: criteria.specialistSelectionInfluence,
      signal: Math.max(researchSignal, experienceSignal * 0.9)
    },
    {
      label: "התאמה למנהל המחלקה",
      weight: criteria.departmentHeadInfluence,
      signal: Math.max(personalFitSignal, recommendationSignal * 0.9)
    }
  ];

  const totalWeight = weightedSignals.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = weightedSignals.reduce((sum, item) => sum + item.weight * item.signal, 0);
  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 50;

  const strengths = weightedSignals
    .filter((item) => item.signal >= 0.8 && item.weight >= 4)
    .slice(0, 3)
    .map((item) => `חוזקה בולטת ב־${item.label.toLowerCase()}`);

  const concerns = weightedSignals
    .filter((item) => item.signal <= 0.35 && item.weight >= 4)
    .slice(0, 3)
    .map((item) => `חסר כרגע חיזוק ב־${item.label.toLowerCase()}`);

  return {
    score,
    strengths:
      strengths.length > 0
        ? strengths
        : ["יש תמונה בסיסית טובה, אבל שווה לעבור גם על החומרים המלאים."],
    concerns:
      concerns.length > 0
        ? concerns
        : ["אין כרגע דגל אדום חד, אבל כדאי לעיין גם בקורות החיים המלאים."],
    shortSummary:
      score >= 75
        ? "נראית התאמה טובה יחסית לדגשים שפורסמו בפתיחה, עם כמה נקודות חיזוק ברורות."
        : score >= 55
          ? "יש התאמה חלקית לפתיחה, אבל כדאי לעבור על החומרים המלאים כדי להבין את הפוטנציאל."
          : "כרגע ההתאמה נראית מוגבלת מול הדגשים שפורסמו, וצריך לבדוק אם יש חיזוקים שלא הופיעו בטופס.",
    engine: "FALLBACK" as const,
    evaluationError: error ?? null
  };
}

function extractJsonText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const choices = Array.isArray(record.choices) ? record.choices : null;

  if (choices) {
    for (const choice of choices) {
      const content = (choice as { message?: { content?: unknown } }).message?.content;

      if (typeof content === "string" && content.trim()) {
        return content;
      }

      if (Array.isArray(content)) {
        const firstText = content.find(
          (part): part is { text?: string } =>
            Boolean(part) && typeof part === "object" && "text" in part
        );

        if (typeof firstText?.text === "string" && firstText.text.trim()) {
          return firstText.text;
        }
      }
    }
  }

  return null;
}

export async function evaluateApplicantMatchWithOpenAI(
  opening: MatchableOpening,
  application: MatchableApplication
): Promise<MatchingResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return fallbackMatch(opening, application, "OPENAI_API_KEY לא הוגדר.");
  }

  const promptPayload = buildMatchingPayload(opening, application);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: getMatchModel(),
        messages: [
          {
            role: "system",
            content:
              "אתה מדרג התאמה של מועמדים לפתיחות התמחות בישראל. החזר JSON תקני בלבד. אל תמציא עובדות שלא מופיעות בקלט, אל תחשוף מידע רגיש, ואל תתגמל ניסוח ארוך בלי תוכן. חשוב על התאמה מעשית לפתיחה לפי הקריטריונים שהמחלקה הגדירה. החזר strength ו-concern בעברית קצרה וברורה."
          },
          {
            role: "user",
            content: JSON.stringify({
              task:
                "דרג/י את התאמת המועמד לפתיחה. החזר score בין 0 ל-100, עד 4 חוזקות, עד 4 חששות, וסיכום קצר אחד. אם חסר מידע משמעותי, ציין זאת ב-concerns.",
              data: promptPayload
            })
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "opening_applicant_match",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                match_score: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100
                },
                strengths: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  maxItems: 4
                },
                concerns: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  maxItems: 4
                },
                short_summary: {
                  type: "string"
                }
              },
              required: ["match_score", "strengths", "concerns", "short_summary"]
            }
          }
        }
      })
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      const message =
        (payload as { error?: { message?: string } })?.error?.message ?? "קריאת OpenAI נכשלה.";
      return fallbackMatch(opening, application, message);
    }

    const content = extractJsonText(payload);

    if (!content) {
      return fallbackMatch(opening, application, "לא התקבל JSON תקין משירות ההתאמה.");
    }

    const parsed = openAiMatchSchema.parse(JSON.parse(content));

    return {
      score: parsed.match_score,
      strengths: parsed.strengths,
      concerns: parsed.concerns,
      shortSummary: parsed.short_summary,
      engine: "OPENAI",
      evaluationError: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI matching failed.";
    return fallbackMatch(opening, application, message);
  }
}
