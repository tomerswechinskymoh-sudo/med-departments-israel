"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister, UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import {
  EXPERIENCE_PHONE_TRUST_COPY,
  EXPERIENCE_PRIVACY_COPY,
  EXPERIENCE_RATING_HELPER_TEXT,
  MAINLY_TAUGHT_BY_OPTIONS,
  MEDICAL_FACULTY_OPTIONS
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { reviewSubmissionSchema } from "@/lib/validation";

type FormValues = z.infer<typeof reviewSubmissionSchema>;
type ReviewerType = FormValues["reviewerType"];

const roleOptions: Array<{ value: ReviewerType; label: string; description: string }> = [
  {
    value: "STUDENT",
    label: "סטודנט",
    description: "חוויה מסבב, אלקטיב או חשיפה קצרה במחלקה."
  },
  {
    value: "INTERN",
    label: "סטאז׳ר",
    description: "מה הרגיש בפועל ביום־יום של הסבב או האלקטיב."
  },
  {
    value: "RESIDENT",
    label: "מתמחה / לאחר סיום התמחות",
    description: "מבט מבפנים על העבודה, הלמידה והצוות."
  }
];

const sharedRatingFields = [
  { name: "teachingQuality", label: "הוראה" },
  { name: "workAtmosphere", label: "אווירה" },
  { name: "researchExposure", label: "מחקר" },
  { name: "lifestyleBalance", label: "עומס" },
  { name: "seniorsApproachability", label: "זמינות בכירים" },
  { name: "overallRecommendation", label: "המלצה" }
] as const;

const rotationLengthOptions = [
  "עד שבוע",
  "שבועיים",
  "3–4 שבועות",
  "5–8 שבועות",
  "יותר מחודשיים"
] as const;

const yearOfExperienceOptions = Array.from({ length: 8 }, (_, index) =>
  String(new Date().getFullYear() - index)
);

const residentCompletionTimingOptions = [
  { value: "last_3_years", label: "ב-3 השנים האחרונות" },
  { value: "3_to_5_years", label: "לפני 3–5 שנים" },
  { value: "more_than_5_years", label: "לפני יותר מ-5 שנים" }
] as const;

const monthlyDutyRangeOptions = ["0–2", "3–5", "6–8", "9–11", "12 ומעלה"] as const;

const yesNoUnknownOptions = [
  { value: "yes", label: "כן" },
  { value: "no", label: "לא" },
  { value: "unknown", label: "לא יודע" }
] as const;

const yesNoPartialUnknownOptions = [
  { value: "yes", label: "כן" },
  { value: "partial", label: "חלקית" },
  { value: "no", label: "לא" },
  { value: "unknown", label: "לא יודע" }
] as const;

const finalGuidelines = [
  "בלי פרטים מזהים",
  "כתיבה עניינית ומכבדת",
  "אפשר לשתף גם חוויות חיוביות וגם קשיים",
  "תוכן עובר בדיקה לפני פרסום",
  "אין לציין מטופלים או אנשי צוות"
];

function isCommunityDepartment(input: { name: string; specialtyName: string }) {
  const haystack = `${input.name} ${input.specialtyName}`.toLowerCase();
  return (
    haystack.includes("משפחה") ||
    haystack.includes("קהילה") ||
    haystack.includes("community") ||
    haystack.includes("family")
  );
}

function isValidInstitutionName(name: string) {
  const normalized = name.trim();
  const digits = normalized.replace(/\D/g, "").length;
  const hasHebrewOrLatin = /[A-Za-zא-ת]/.test(normalized);
  const looksLikePhone = digits >= 7 && digits >= normalized.replace(/\s/g, "").length * 0.55;

  return normalized.length >= 2 && hasHebrewOrLatin && !looksLikePhone;
}

function isSurgicalSpecialtyName(name?: string | null) {
  const normalized = name ?? "";

  return /כירורג|אורתופד|אורולוג|נשים|עיניים|אף|אוזן|פה ולסת|פלסטי|נוירוכירורג/.test(normalized);
}

function getRoleDetailsDefaults(reviewerType: ReviewerType): FormValues["roleDetails"] {
  return {
    medicalSchool: MEDICAL_FACULTY_OPTIONS[0],
    overallRating: 4,
    researchEncouragement: 3,
    mainlyTaughtBy: "MIXED",
    clinicalExposure: 4,
    fitForWho: undefined,
    rotationLength: reviewerType === "STUDENT" ? rotationLengthOptions[1] : undefined,
    durationWeeks: reviewerType === "INTERN" ? 4 : undefined,
    yearOfExperience:
      reviewerType === "INTERN" || reviewerType === "STUDENT"
        ? yearOfExperienceOptions[0]
        : undefined,
    attitudeFromResidents: reviewerType === "STUDENT" ? undefined : 4,
    attitudeFromSeniors: reviewerType === "STUDENT" ? undefined : 4,
    workloadBalance: reviewerType === "STUDENT" ? undefined : 3,
    residentCurrentStatus: reviewerType === "RESIDENT" ? "active" : undefined,
    residencyCompletedTiming: undefined,
    departmentElectiveImportance: reviewerType === "RESIDENT" ? 3 : undefined,
    departmentObservationImportance: reviewerType === "RESIDENT" ? 3 : undefined,
    outsideShiftsImportance: reviewerType === "RESIDENT" ? 3 : undefined,
    researchImportance: reviewerType === "RESIDENT" ? 3 : undefined,
    medicalSchoolInfluence: reviewerType === "RESIDENT" ? 3 : undefined,
    departmentHeadInfluence: reviewerType === "RESIDENT" ? 3 : undefined,
    seniorDecisionInfluence: reviewerType === "RESIDENT" ? 3 : undefined,
    wholeDepartmentSelectionInfluence: reviewerType === "RESIDENT" ? 3 : undefined,
    hasAdmissionCommittee: reviewerType === "RESIDENT" ? "unknown" : undefined,
    monthlyDutyRange: reviewerType === "RESIDENT" ? monthlyDutyRangeOptions[1] : undefined,
    parentPositionAvailable: reviewerType === "RESIDENT" ? "unknown" : undefined,
    averageArrivalTime: undefined,
    personalNeedsConsideration: reviewerType === "RESIDENT" ? 3 : undefined,
    teamwork: reviewerType === "RESIDENT" ? 4 : undefined,
    belonging: reviewerType === "RESIDENT" ? 4 : undefined,
    stageAVacation: reviewerType === "RESIDENT" ? "unknown" : undefined,
    stageBVacation: reviewerType === "RESIDENT" ? "unknown" : undefined,
    conferenceFunding: reviewerType === "RESIDENT" ? "unknown" : undefined,
    surgicalAutonomy: undefined
  };
}

function verificationCopyForType(reviewerType: ReviewerType) {
  if (reviewerType === "STUDENT") {
    return "כרטיס סטודנט, אישור סבב או מסמך אחר, רק אם נוח לך.";
  }

  if (reviewerType === "INTERN") {
    return "אישור סטאז׳, אלקטיב או סבב, רק אם נוח לך.";
  }

  return "אישור רשמי על התמחות במחלקה, רק אם נוח לך.";
}

function tipsLabelForType(reviewerType: ReviewerType) {
  if (reviewerType === "STUDENT") {
    return "מה היית אומר למישהו שמגיע לסבב או לאלקטיב הזה?";
  }

  if (reviewerType === "INTERN") {
    return "מה היית אומר למישהו שמגיע לאלקטיב או לסטאז׳ במחלקה?";
  }

  return "מה היית אומר למישהו שמתחיל במחלקה הזאת?";
}

function fitPlaceholderForType(reviewerType: ReviewerType) {
  if (reviewerType === "STUDENT") {
    return "למשל: מתאים למי שמחפש הוראה צמודה, חשיפה קלינית גבוהה או קצב רגוע יותר.";
  }

  if (reviewerType === "INTERN") {
    return "למשל: מתאים למי שרוצה אחריות, הרבה מגע קליני או דווקא סביבה תומכת.";
  }

  return "למשל: מתאים למי שמחפש קליניקה חזקה, מחקר, צוות מסוים או סגנון עבודה מסוים.";
}

function ratingSelectLabel(value: number) {
  if (value === 1) return `${value} · חלש`;
  if (value === 5) return `${value} · מצוין`;
  return String(value);
}

function RatingSelect({
  label,
  registration
}: {
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-ink">{label}</span>
      <select
        {...registration}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            {ratingSelectLabel(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResidentQuestionnaire({
  register,
  selectedSpecialtyName
}: {
  register: UseFormRegister<FormValues>;
  selectedSpecialtyName?: string | null;
}) {
  const isSurgical = isSurgicalSpecialtyName(selectedSpecialtyName);

  return (
    <div className="space-y-7">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">פקולטה</span>
          <select
            {...register("roleDetails.medicalSchool")}
            className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
          >
            {MEDICAL_FACULTY_OPTIONS.map((faculty) => (
              <option key={faculty} value={faculty}>
                {faculty}
              </option>
            ))}
          </select>
        </label>
        <RatingSelect
          label="המלצה כללית"
          registration={register("overallRecommendation", { valueAsNumber: true })}
        />
      </div>

      <section className="space-y-4">
        <h4 className="text-xl font-black text-ink">1. תהליך הקבלה למחלקה</h4>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RatingSelect label="חשיבות אלקטיב במחלקה" registration={register("roleDetails.departmentElectiveImportance", { valueAsNumber: true })} />
          <RatingSelect label="חשיבות הסתכלות במחלקה" registration={register("roleDetails.departmentObservationImportance", { valueAsNumber: true })} />
          <RatingSelect label="חשיבות תורנויות חוץ במחלקה" registration={register("roleDetails.outsideShiftsImportance", { valueAsNumber: true })} />
          <RatingSelect label="חשיבות פרסומים ומחקר" registration={register("roleDetails.researchImportance", { valueAsNumber: true })} />
          <RatingSelect label="חשיבות מוסד הלימוד" registration={register("roleDetails.medicalSchoolInfluence", { valueAsNumber: true })} />
          <RatingSelect label="מנהל המחלקה קובע מי מתקבל" registration={register("roleDetails.departmentHeadInfluence", { valueAsNumber: true })} />
          <RatingSelect label="מנהל המחלקה והבכירים קובעים מי מתקבל" registration={register("roleDetails.seniorDecisionInfluence", { valueAsNumber: true })} />
          <RatingSelect label="כלל המחלקה משתתפת בבחירה" registration={register("roleDetails.wholeDepartmentSelectionInfluence", { valueAsNumber: true })} />
          <label className="block">
            <span className="block text-sm font-bold text-ink">האם מתקיימת ועדת קבלה לפני בחירת מתמחים?</span>
            <select
              {...register("roleDetails.hasAdmissionCommittee")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            >
              {yesNoUnknownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">מה היית ממליץ למועמד שמעוניין להתקבל למחלקה?</span>
          <textarea
            {...register("tips")}
            className="min-h-24 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h4 className="text-xl font-black text-ink">2. עומס ואיזון חיים</h4>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="block text-sm font-bold text-ink">טווח תורנויות בחודש</span>
            <select
              {...register("roleDetails.monthlyDutyRange")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            >
              {monthlyDutyRangeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <RatingSelect label="מידת שחיקה" registration={register("lifestyleBalance", { valueAsNumber: true })} />
          <label className="block">
            <span className="block text-sm font-bold text-ink">האם קיימת משרת הורה?</span>
            <select
              {...register("roleDetails.parentPositionAvailable")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            >
              {yesNoUnknownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-bold text-ink">שעת הגעה ממוצעת בבוקר</span>
            <input
              {...register("roleDetails.averageArrivalTime")}
              placeholder="למשל 07:30"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            />
          </label>
          <RatingSelect
            label="מידת ההתחשבות במקרים אישיים"
            registration={register("roleDetails.personalNeedsConsideration", { valueAsNumber: true })}
          />
          <RatingSelect label="עומס ואיזון" registration={register("roleDetails.workloadBalance", { valueAsNumber: true })} />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">האם יש משהו נוסף שחשוב לדעת על עומס העבודה במחלקה?</span>
          <textarea
            {...register("cons")}
            className="min-h-24 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h4 className="text-xl font-black text-ink">3. אווירה ויחסים במחלקה</h4>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RatingSelect label="היחס בין המתמחים" registration={register("roleDetails.attitudeFromResidents", { valueAsNumber: true })} />
          <RatingSelect label="היחס של הבכירים למתמחים" registration={register("roleDetails.attitudeFromSeniors", { valueAsNumber: true })} />
          <RatingSelect label="תחושת עבודת צוות" registration={register("roleDetails.teamwork", { valueAsNumber: true })} />
          <RatingSelect label="תחושת שייכות למחלקה" registration={register("roleDetails.belonging", { valueAsNumber: true })} />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">כיצד היית מתאר/ת את האווירה במחלקה?</span>
          <textarea
            {...register("pros")}
            className="min-h-24 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h4 className="text-xl font-black text-ink">4. מקצועיות והכשרה</h4>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="block text-sm font-bold text-ink">האם קיימת חופשה לקראת מבחני שלב א׳?</span>
            <select
              {...register("roleDetails.stageAVacation")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            >
              {yesNoPartialUnknownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-bold text-ink">האם קיימת חופשה לקראת מבחני שלב ב׳?</span>
            <select
              {...register("roleDetails.stageBVacation")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            >
              {yesNoPartialUnknownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <RatingSelect label="דירוג איכות ההוראה במחלקה" registration={register("teachingQuality", { valueAsNumber: true })} />
          <RatingSelect label="דירוג הציפייה למחקר ופרסום" registration={register("researchExposure", { valueAsNumber: true })} />
          <label className="block">
            <span className="block text-sm font-bold text-ink">מימון כנסים וקורסים</span>
            <select
              {...register("roleDetails.conferenceFunding")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
            >
              {yesNoPartialUnknownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          {isSurgical ? (
            <RatingSelect
              label="הזדמנויות ניתוחיות ועצמאות"
              registration={register("roleDetails.surgicalAutonomy", { valueAsNumber: true })}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ReviewForm({
  departments,
  selectedDepartmentId,
  initialReviewerType = "INTERN",
  onSubmitted
}: {
  departments: {
    id: string;
    slug: string;
    name: string;
    institution: {
      id: string;
      name: string;
      type: "HOSPITAL" | "HMO";
    };
    specialty: {
      id: string;
      name: string;
    };
  }[];
  selectedDepartmentId?: string;
  initialReviewerType?: ReviewerType;
  compact?: boolean;
  showGuidancePanels?: boolean;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const institutions = useMemo(
    () =>
      Array.from(
        new Map(
          departments
            .filter((department) => isValidInstitutionName(department.institution.name))
            .map((department) => [
              department.institution.id,
              {
                id: department.institution.id,
                name: department.institution.name,
                type: department.institution.type
              }
            ])
        ).values()
      ),
    [departments]
  );
  const initialInstitutionId =
    departments.find((department) => department.id === selectedDepartmentId)?.institution.id ?? "";
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(initialInstitutionId);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(reviewSubmissionSchema),
    defaultValues: {
      departmentId: selectedDepartmentId ?? "",
      reviewerType: initialReviewerType,
      fullName: "",
      phone: "",
      hasVerificationDocument: false,
      email: "",
      isAnonymous: true,
      teachingQuality: 4,
      workAtmosphere: 4,
      seniorsApproachability: 4,
      researchExposure: 3,
      lifestyleBalance: 3,
      overallRecommendation: 4,
      pros: "",
      cons: "",
      tips: "",
      roleDetails: getRoleDetailsDefaults(initialReviewerType),
      consentToContact: true,
      consentToTerms: true,
      consentNoPatientInfo: true
    }
  });

  useEffect(() => {
    setValue("reviewerType", initialReviewerType);
    setValue("roleDetails", getRoleDetailsDefaults(initialReviewerType));
  }, [initialReviewerType, setValue]);

  useEffect(() => {
    setValue("hasVerificationDocument", Boolean(verificationDocument), { shouldValidate: true });
  }, [setValue, verificationDocument]);

  const reviewerType = watch("reviewerType");
  const reviewerTypeLabel = roleOptions.find((role) => role.value === reviewerType)?.label ?? "משתף";
  const isAnonymous = watch("isAnonymous");
  const selectedDepartmentIdValue = watch("departmentId");
  const residentCurrentStatus = watch("roleDetails.residentCurrentStatus");
  const selectedInstitution = institutions.find((institution) => institution.id === selectedInstitutionId) ?? null;
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentIdValue) ?? null;
  const availableDepartments = useMemo(() => {
    const institutionDepartments = departments.filter(
      (department) => department.institution.id === selectedInstitutionId
    );

    if (!selectedInstitution) {
      return [];
    }

    if (selectedInstitution.type === "HOSPITAL") {
      return institutionDepartments.filter(
        (department) =>
          !isCommunityDepartment({
            name: department.name,
            specialtyName: department.specialty.name
          })
      );
    }

    const prioritized = institutionDepartments
      .map((department) => ({
        department,
        isCommunity: isCommunityDepartment({
          name: department.name,
          specialtyName: department.specialty.name
        }),
        isFamilyMedicine: `${department.name} ${department.specialty.name}`.includes("משפחה")
      }))
      .sort((left, right) => {
        if (left.isFamilyMedicine !== right.isFamilyMedicine) {
          return left.isFamilyMedicine ? -1 : 1;
        }

        if (left.isCommunity !== right.isCommunity) {
          return left.isCommunity ? -1 : 1;
        }

        return left.department.name.localeCompare(right.department.name, "he");
      })
      .map((entry) => entry.department);

    return prioritized.some((department) =>
      isCommunityDepartment({ name: department.name, specialtyName: department.specialty.name })
    )
      ? prioritized.filter((department) =>
          isCommunityDepartment({ name: department.name, specialtyName: department.specialty.name })
        )
      : prioritized;
  }, [departments, selectedInstitution, selectedInstitutionId]);

  useEffect(() => {
    if (!selectedInstitutionId) {
      setValue("departmentId", "");
      return;
    }

    const selectedDepartmentStillValid = availableDepartments.some(
      (department) => department.id === selectedDepartmentIdValue
    );

    if (!selectedDepartmentStillValid) {
      setValue("departmentId", "");
    }
  }, [availableDepartments, selectedDepartmentIdValue, selectedInstitutionId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const formData = new FormData();
    formData.set("departmentId", values.departmentId);
    formData.set("reviewerType", values.reviewerType);
    formData.set("fullName", values.fullName ?? "");
    formData.set("phone", values.phone ?? "");
    formData.set("email", values.email ?? "");
    formData.set("isAnonymous", String(values.isAnonymous));
    formData.set("teachingQuality", String(values.teachingQuality));
    formData.set("workAtmosphere", String(values.workAtmosphere));
    formData.set("seniorsApproachability", String(values.seniorsApproachability));
    formData.set("researchExposure", String(values.researchExposure));
    formData.set("lifestyleBalance", String(values.lifestyleBalance));
    formData.set("overallRecommendation", String(values.overallRecommendation));
    formData.set("pros", values.pros ?? "");
    formData.set("cons", values.cons ?? "");
    formData.set("tips", values.tips ?? "");
    formData.set("roleDetails", JSON.stringify(values.roleDetails));
    formData.set("consentToContact", String(values.consentToContact));
    formData.set("consentToTerms", String(values.consentToTerms));
    formData.set("consentNoPatientInfo", String(values.consentNoPatientInfo));

    if (verificationDocument) {
      formData.set("verificationDocument", verificationDocument);
    }

    const response = await fetch("/api/reviews", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "לא הצלחנו לשמור את השיתוף.");
      return;
    }

    setMessage(payload?.message ?? "השיתוף נשמר ונשלח לבדיקה.");
    reset({
      departmentId: selectedDepartmentId ?? "",
      reviewerType: initialReviewerType,
      fullName: "",
      phone: "",
      hasVerificationDocument: false,
      email: "",
      isAnonymous: true,
      teachingQuality: 4,
      workAtmosphere: 4,
      seniorsApproachability: 4,
      researchExposure: 3,
      lifestyleBalance: 3,
      overallRecommendation: 4,
      pros: "",
      cons: "",
      tips: "",
      roleDetails: getRoleDetailsDefaults(initialReviewerType),
      consentToContact: true,
      consentToTerms: true,
      consentNoPatientInfo: true
    });
    setStep(1);
    setSelectedInstitutionId(initialInstitutionId);
    setVerificationDocument(null);
    router.refresh();
    onSubmitted?.();
  });

  const stepItems = [
    { value: 1, label: "זהות והקשר" },
    { value: 2, label: "החוויה" },
    { value: 3, label: "בדיקה ושליחה" }
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {message ? (
        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/90 px-5 py-4 text-sm leading-7 text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {stepItems.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStep(item.value)}
            className={cn(
              "rounded-full border px-4 py-2.5 text-sm font-bold transition",
              step === item.value
                ? "border-brand-300 bg-brand-900 text-white shadow-panel"
                : "border-brand-100 bg-white text-slate-600 hover:bg-brand-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <input type="hidden" {...register("reviewerType")} />
      <input type="hidden" {...register("hasVerificationDocument")} />

      {step === 1 ? (
        <section className="space-y-8 rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.38)]">
          <div>
            <p className="text-sm font-semibold text-brand-700">שלב 1</p>
            <h3 className="mt-1 text-3xl font-black text-ink">מאיפה נקודת המבט שלך?</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {roleOptions.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => {
                  setValue("reviewerType", role.value, { shouldValidate: true });
                  setValue("roleDetails", getRoleDetailsDefaults(role.value), {
                    shouldValidate: true
                  });
                }}
                className={cn(
                  "min-h-36 rounded-[1.5rem] border p-5 text-right transition",
                  reviewerType === role.value
                    ? "border-brand-300 bg-brand-900 text-white shadow-panel"
                    : "border-slate-200 bg-white text-ink shadow-sm hover:-translate-y-0.5 hover:border-brand-200"
                )}
              >
                <p className="text-xl font-black">{role.label}</p>
                <p className={cn("mt-2 text-sm leading-7", reviewerType === role.value ? "text-white/82" : "text-slate-600")}>
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          {reviewerType === "RESIDENT" ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-sm font-black text-ink">מצב נוכחי</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { value: "active", label: "מתמחה פעיל" },
                  { value: "completed", label: "סיימתי התמחות" }
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register("roleDetails.residentCurrentStatus")}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {residentCurrentStatus === "completed" ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {residentCompletionTimingOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-700"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register("roleDetails.residencyCompletedTiming")}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">מוסד</span>
              <select
                value={selectedInstitutionId}
                onChange={(event) => setSelectedInstitutionId(event.target.value)}
                className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
              >
                <option value="">בחירת מוסד</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">מחלקה</span>
              <select
                {...register("departmentId")}
                className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
              >
                <option value="">בחירת מחלקה</option>
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} · {department.specialty.name}
                  </option>
                ))}
              </select>
              {errors.departmentId ? (
                <span className="mt-2 block text-xs text-rose-600">{errors.departmentId.message}</span>
              ) : null}
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-ink">פרטים אופציונליים</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                אפשר להשאיר פרטים לאימות, ואפשר גם לשלוח בעילום שם.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">שם</span>
                <input
                  {...register("fullName")}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder={isAnonymous ? "לא חובה" : "שם לפרסום"}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">טלפון</span>
                <input
                  {...register("phone")}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="לא חובה"
                />
                <span className="mt-2 block text-xs leading-6 text-slate-500">{EXPERIENCE_PHONE_TRUST_COPY}</span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">אימייל</span>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="לא חובה"
                />
                <span className="mt-2 block text-xs leading-6 text-slate-500">{EXPERIENCE_PRIVACY_COPY}</span>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">העלאת הוכחה</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                onChange={(event) => setVerificationDocument(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">{verificationCopyForType(reviewerType)}</p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <input type="checkbox" className="mt-1" {...register("isAnonymous")} />
              <span>
                <span className="block font-semibold text-ink">שליחה בעילום שם</span>
                <span className="mt-1 block leading-6">
                  אם בחרת בעילום שם, לא נציג באתר שם, טלפון או פרט מזהה אחר.
                </span>
              </span>
            </label>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-7 rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.38)]">
          <div>
            <p className="text-sm font-semibold text-brand-700">שלב 2 · {reviewerTypeLabel}</p>
            <h3 className="mt-1 text-2xl font-black text-ink">ספרו על החוויה בקצרה</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{EXPERIENCE_RATING_HELPER_TEXT}</p>
          </div>

          {reviewerType === "RESIDENT" ? (
            <ResidentQuestionnaire
              register={register}
              selectedSpecialtyName={selectedDepartment?.specialty.name}
            />
          ) : (
            <>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">פקולטה</span>
              <select
                {...register("roleDetails.medicalSchool")}
                className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
              >
                {MEDICAL_FACULTY_OPTIONS.map((faculty) => (
                  <option key={faculty} value={faculty}>
                    {faculty}
                  </option>
                ))}
              </select>
            </label>

            {reviewerType === "STUDENT" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">משך הסבב</span>
                <select
                  {...register("roleDetails.rotationLength")}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  <option value="">בחירת אורך</option>
                  {rotationLengthOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : reviewerType === "INTERN" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">משך בשבועות</span>
                <input
                  {...register("roleDetails.durationWeeks")}
                  type="number"
                  min={1}
                  max={52}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm leading-7 text-slate-700">
                במילוי כמתמחה אין צורך לציין אורך סבב.
              </div>
            )}

            {reviewerType === "STUDENT" || reviewerType === "INTERN" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">שנה</span>
                <select
                  {...register("roleDetails.yearOfExperience")}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  <option value="">בחירת שנה</option>
                  {yearOfExperienceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <RatingSelect
              label="דירוג כללי"
              registration={register("roleDetails.overallRating", { valueAsNumber: true })}
            />
            {sharedRatingFields.map((field) => (
              <RatingSelect
                key={field.name}
                label={field.label}
                registration={register(field.name, { valueAsNumber: true })}
              />
            ))}
            <RatingSelect
              label="חשיפה קלינית"
              registration={register("roleDetails.clinicalExposure", { valueAsNumber: true })}
            />
            <RatingSelect
              label="עידוד למחקר"
              registration={register("roleDetails.researchEncouragement", { valueAsNumber: true })}
            />
            <label className="block">
              <span className="block text-sm font-bold text-ink">מי לימד בפועל?</span>
              <select
                {...register("roleDetails.mainlyTaughtBy")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-300"
              >
                {MAINLY_TAUGHT_BY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {reviewerType !== "STUDENT" ? (
              <>
                <RatingSelect
                  label="יחס מהמתמחים"
                  registration={register("roleDetails.attitudeFromResidents", { valueAsNumber: true })}
                />
                <RatingSelect
                  label="יחס מהבכירים"
                  registration={register("roleDetails.attitudeFromSeniors", { valueAsNumber: true })}
                />
                <RatingSelect
                  label="עומס ואיזון"
                  registration={register("roleDetails.workloadBalance", { valueAsNumber: true })}
                />
              </>
            ) : null}
          </div>

          <div className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">מה עבד טוב?</span>
              <textarea
                {...register("pros")}
                className="min-h-28 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="הוראה, יחס, חשיפה, או כל דבר שעזר לך."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">מה היה מאתגר?</span>
              <textarea
                {...register("cons")}
                className="min-h-28 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="עומס, ליווי פחות צמוד, קצב מהיר או משהו שכדאי לדעת מראש."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">{tipsLabelForType(reviewerType)}</span>
              <textarea
                {...register("tips")}
                className="min-h-28 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="טיפ אחד או שניים שהיו עוזרים גם לך."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">למי המחלקה מתאימה?</span>
              <textarea
                {...register("roleDetails.fitForWho")}
                className="min-h-24 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
              placeholder={fitPlaceholderForType(reviewerType)}
              />
            </label>
          </div>
            </>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-6 rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.38)]">
          <div>
            <p className="text-sm font-semibold text-brand-700">שלב 3</p>
            <h3 className="mt-1 text-2xl font-black text-ink">מבט אחרון לפני שליחה</h3>
          </div>

          <div className="rounded-[1.5rem] border border-amber-300 bg-amber-50 px-5 py-5 text-amber-950 shadow-sm">
            <p className="text-lg font-black">חשוב לפני שליחה</p>
            <div className="mt-4 space-y-2 text-sm font-bold leading-7">
              {finalGuidelines.map((item) => (
                <p key={item}>✓ {item}</p>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-amber-200 pt-4">
              <label className="flex items-start gap-3 text-sm font-semibold leading-7 text-amber-950">
                <input type="checkbox" className="mt-1" {...register("consentToContact")} />
                <span>אפשר ליצור איתי קשר רק אם השארתי פרטי קשר ורק לצורך אימות.</span>
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold leading-7 text-amber-950">
                <input type="checkbox" className="mt-1" {...register("consentToTerms")} />
                <span>ברור לי שהשיתוף עובר בדיקה לפני פרסום.</span>
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold leading-7 text-amber-950">
                <input type="checkbox" className="mt-1" {...register("consentNoPatientInfo")} />
                <span>לא כללתי מידע מזהה על מטופלים, אנשי צוות או פרטים רגישים.</span>
              </label>
            </div>
          </div>

          {Object.keys(errors).length > 0 ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
              יש כמה שדות שצריך להשלים לפני השליחה. אפשר לחזור לשלבים הקודמים ולתקן.
            </div>
          ) : null}
        </section>
      ) : null}

      <div dir="ltr" className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 bg-white/95 px-2 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => setStep((current) => (current === 1 ? 1 : ((current - 1) as 1 | 2 | 3)))}
          disabled={step === 1}
          className="rounded-full border border-brand-100 px-5 py-3 text-sm font-bold text-brand-800 transition hover:bg-brand-50 disabled:opacity-40"
          dir="rtl"
        >
          חזרה
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((current) => (current === 1 ? 2 : 3))}
            className="rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
            dir="rtl"
          >
            המשך
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-gradient-to-l from-brand-700 to-teal-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-300/40 transition hover:from-brand-800 hover:to-teal-700 disabled:opacity-60"
            dir="rtl"
          >
            {isSubmitting ? "שולח/ת..." : "שליחה"}
          </button>
        )}
      </div>
    </form>
  );
}
