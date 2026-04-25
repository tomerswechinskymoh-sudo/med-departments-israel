"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  EXPERIENCE_LEGAL_WARNING,
  EXPERIENCE_PHONE_TRUST_COPY,
  EXPERIENCE_PRIVACY_COPY,
  EXPERIENCE_RATING_HELPER_TEXT,
  MAINLY_TAUGHT_BY_OPTIONS,
  MEDICAL_FACULTY_OPTIONS,
  REVIEW_GUIDELINES
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { reviewSubmissionSchema } from "@/lib/validation";

type FormValues = z.infer<typeof reviewSubmissionSchema>;
type ReviewerType = FormValues["reviewerType"];

const roleOptions: Array<{
  value: ReviewerType;
  label: string;
  description: string;
}> = [
  {
    value: "STUDENT",
    label: "סטודנט",
    description: "לשתף איך החוויה במחלקה נראתה בפועל במהלך הסבב או האלקטיב."
  },
  {
    value: "INTERN",
    label: "סטאז׳ר",
    description: "להסביר איך האלקטיב או הסבב במחלקה באמת הרגיש ביום־יום."
  },
  {
    value: "RESIDENT",
    label: "מתמחה",
    description: "לתאר איך המחלקה נראית מבפנים לאורך העבודה השוטפת."
  }
];

const sharedRatingFields = [
  { name: "teachingQuality", label: "איכות ההוראה" },
  { name: "workAtmosphere", label: "אווירה במחלקה" },
  { name: "seniorsApproachability", label: "נגישות בכירים" },
  { name: "researchExposure", label: "חשיפה למחקר" },
  { name: "lifestyleBalance", label: "עומס ואיזון חיים" },
  { name: "overallRecommendation", label: "האם היית ממליץ?" }
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

function isCommunityDepartment(input: { name: string; specialtyName: string }) {
  const haystack = `${input.name} ${input.specialtyName}`.toLowerCase();
  return (
    haystack.includes("משפחה") ||
    haystack.includes("קהילה") ||
    haystack.includes("community") ||
    haystack.includes("family")
  );
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
    workloadBalance: reviewerType === "STUDENT" ? undefined : 3
  };
}

function verificationCopyForType(reviewerType: ReviewerType) {
  if (reviewerType === "STUDENT") {
    return {
      label: "כרטיס סטודנט או מסמך שמראה שהיית בסבב",
      description:
        "אפשר לצרף כרטיס סטודנט יחד עם הוכחת סבב, או פשוט להשאיר טלפון לאימות ידני."
    };
  }

  if (reviewerType === "INTERN") {
    return {
      label: "אישור סטאז׳ / אלקטיב / סבב",
      description:
        "אפשר לצרף אישור רשמי, מייל אלקטיב או מסמך מהמחלקה. אם נוח יותר, אפשר להשאיר טלפון במקום."
    };
  }

  return {
    label: "אישור רשמי על התמחות במחלקה",
    description:
      "אפשר לצרף מסמך רשמי מהמחלקה או מבית החולים. לחלופין, אפשר להשאיר טלפון לאימות ידני."
  };
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
    return "למשל: מתאים למי שרוצה אחריות, עומס, הרבה מגע קליני או דווקא סביבה יותר תומכת.";
  }

  return "למשל: מתאים למי שמחפש קליניקה חזקה, מחקר, סגנון ניהולי מסוים או חיי צוות מסוימים.";
}

function ratingSelectLabel(value: number) {
  if (value === 1) {
    return `${value} · חלש מאוד`;
  }

  if (value === 5) {
    return `${value} · מצוין`;
  }

  return String(value);
}

export function ReviewForm({
  departments,
  selectedDepartmentId,
  initialReviewerType = "INTERN",
  compact = false,
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
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const institutions = useMemo(
    () =>
      Array.from(
        new Map(
          departments.map((department) => [
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
  const selectedInstitution = institutions.find((institution) => institution.id === selectedInstitutionId) ?? null;
  const verificationCopy = verificationCopyForType(reviewerType);
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

    setMessage(payload?.message ?? "השיתוף נשמר.");
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
    setSelectedInstitutionId(initialInstitutionId);
    setVerificationDocument(null);
    router.refresh();
    onSubmitted?.();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {message ? (
        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/90 px-5 py-4 text-sm leading-7 text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className={compact ? "grid gap-5 lg:grid-cols-[1.08fr_0.92fr]" : "space-y-5"}>
        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-700">מאיפה נקודת המבט שלך?</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  בוחרים מסלול אחד, ואז השאלות מתעדכנות כך שיתאימו למה שבאמת חווית.
                </p>
              </div>
            </div>

            <input type="hidden" {...register("reviewerType")} />
            <input type="hidden" {...register("hasVerificationDocument")} />

            <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                    "rounded-[1.5rem] border p-4 text-right transition",
                    reviewerType === role.value
                      ? "border-brand-300 bg-brand-900 text-white shadow-panel"
                      : "border-brand-100 bg-brand-50/50 text-ink hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white"
                  )}
                >
                  <p className="text-base font-bold">{role.label}</p>
                  <p
                    className={cn(
                      "mt-2 text-sm leading-7",
                      reviewerType === role.value ? "text-white/82" : "text-slate-600"
                    )}
                  >
                    {role.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <p className="text-sm font-semibold text-brand-700">איפה זה היה?</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מוסד</label>
                <select
                  value={selectedInstitutionId}
                  onChange={(event) => setSelectedInstitutionId(event.target.value)}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  <option value="">בחירת מוסד</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name} ·{" "}
                      {institution.type === "HOSPITAL" ? "בית חולים" : "קופת חולים / קהילה"}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  קודם בוחרים מוסד, ואז רואים רק מחלקות שמתאימות לו.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מחלקה / מסלול</label>
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
                {selectedInstitution?.type === "HOSPITAL" ? (
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    בבתי חולים לא מוצגות כאן מחלקות קהילה כמו רפואת משפחה.
                  </p>
                ) : selectedInstitution?.type === "HMO" ? (
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    בקופות חולים מוצגים בעיקר תחומי קהילה, ובמיוחד רפואת משפחה.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              {availableDepartments.length === 0 && selectedInstitutionId ? (
                <p className="text-xs text-slate-500">לא נמצאו מחלקות זמינות למוסד שנבחר.</p>
              ) : null}
              {errors.departmentId ? (
                <p className="mt-2 text-xs text-rose-600">{errors.departmentId.message}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <p className="text-sm font-semibold text-brand-700">איך זה יופיע באתר?</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">שם מלא</label>
                <input
                  {...register("fullName")}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder={isAnonymous ? "רק אם תרצה להופיע בשם" : "זה השם שיופיע באתר"}
                />
                {!isAnonymous ? (
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    אם בחרת לפרסם בשם, זה השם שיופיע אחרי אישור.
                  </p>
                ) : null}
                {errors.fullName ? (
                  <p className="mt-2 text-xs text-rose-600">{errors.fullName.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">טלפון לאימות</label>
                <input
                  {...register("phone")}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="אפשר להשאיר אם נוח לך"
                />
                <p className="mt-2 text-xs leading-6 text-slate-500">{EXPERIENCE_PHONE_TRUST_COPY}</p>
                {errors.phone ? (
                  <p className="mt-2 text-xs text-rose-600">{errors.phone.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="לא חובה"
                />
                <p className="mt-2 text-xs leading-6 text-slate-500">{EXPERIENCE_PRIVACY_COPY}</p>
                {errors.email ? <p className="mt-2 text-xs text-rose-600">{errors.email.message}</p> : null}
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-brand-100 bg-brand-50/60 p-4">
              <label className="mb-2 block text-sm font-semibold text-ink">{verificationCopy.label}</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                onChange={(event) => setVerificationDocument(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">{verificationCopy.description}</p>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50/95 px-4 py-4 text-sm text-slate-700">
              <input type="checkbox" className="mt-1" {...register("isAnonymous")} />
              <span>
                <span className="block font-semibold text-amber-950">אני רוצה להישאר בעילום שם</span>
                <span className="mt-1 block leading-6">
                  אם בחרת בעילום שם, לא נציג באתר שם, טלפון או כל פרט מזהה אחר.
                </span>
              </span>
            </label>
          </section>

          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-700">פרטים שמתאימים למסלול שלך</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  כאן אוספים את הפרטים שמיוחדים לחוויה במסלול {reviewerTypeLabel}.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">פקולטה לרפואה</label>
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
                {errors.roleDetails?.medicalSchool ? (
                  <p className="mt-2 text-xs text-rose-600">{errors.roleDetails.medicalSchool.message}</p>
                ) : null}
              </div>

              {reviewerType === "STUDENT" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">אורך הסבב / האלקטיב</label>
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
                  {errors.roleDetails?.rotationLength ? (
                    <p className="mt-2 text-xs text-rose-600">{errors.roleDetails.rotationLength.message}</p>
                  ) : null}
                </div>
              ) : reviewerType === "INTERN" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">משך הזמן במחלקה (בשבועות)</label>
                  <input
                    {...register("roleDetails.durationWeeks")}
                    type="number"
                    min={1}
                    max={52}
                    className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  />
                  {errors.roleDetails?.durationWeeks ? (
                    <p className="mt-2 text-xs text-rose-600">{errors.roleDetails.durationWeeks.message}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50/60 px-4 py-4 text-sm leading-7 text-slate-700">
                  במילוי כמתמחה אין צורך לציין אורך סבב, אבל כן נשמור את דירוגי הקליניקה, ההוראה,
                  היחס והאיזון כדי שאפשר יהיה להשוות טוב יותר בין מחלקות.
                </div>
              )}

              {reviewerType === "STUDENT" || reviewerType === "INTERN" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink">באיזו שנה זה התרחש?</label>
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
                  {errors.roleDetails?.yearOfExperience ? (
                    <p className="mt-2 text-xs text-rose-600">{errors.roleDetails.yearOfExperience.message}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">דירוג כללי</label>
                <select
                  {...register("roleDetails.overallRating", { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {ratingSelectLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">עידוד למחקר</label>
                <select
                  {...register("roleDetails.researchEncouragement", { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {ratingSelectLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מי הוביל את הלמידה בפועל?</label>
                <select
                  {...register("roleDetails.mainlyTaughtBy")}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  {MAINLY_TAUGHT_BY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.roleDetails?.mainlyTaughtBy ? (
                  <p className="mt-2 text-xs text-rose-600">{errors.roleDetails.mainlyTaughtBy.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">חשיפה קלינית</label>
                <select
                  {...register("roleDetails.clinicalExposure", { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {ratingSelectLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              {reviewerType !== "STUDENT" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">יחס מהמתמחים</label>
                    <select
                      {...register("roleDetails.attitudeFromResidents", { valueAsNumber: true })}
                      className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {ratingSelectLabel(value)}
                        </option>
                      ))}
                    </select>
                    {errors.roleDetails?.attitudeFromResidents ? (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.roleDetails.attitudeFromResidents.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">יחס מהבכירים</label>
                    <select
                      {...register("roleDetails.attitudeFromSeniors", { valueAsNumber: true })}
                      className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {ratingSelectLabel(value)}
                        </option>
                      ))}
                    </select>
                    {errors.roleDetails?.attitudeFromSeniors ? (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.roleDetails.attitudeFromSeniors.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">עומס ואיזון חיים</label>
                    <select
                      {...register("roleDetails.workloadBalance", { valueAsNumber: true })}
                      className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {ratingSelectLabel(value)}
                        </option>
                      ))}
                    </select>
                    {errors.roleDetails?.workloadBalance ? (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.roleDetails.workloadBalance.message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <p className="text-sm font-semibold text-brand-700">בכמה מילים ובכמה מספרים</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{EXPERIENCE_RATING_HELPER_TEXT}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {sharedRatingFields.map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-semibold text-ink">{field.label}</label>
                  <select
                    {...register(field.name, { valueAsNumber: true })}
                    className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {ratingSelectLabel(value)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-brand-100/80 bg-gradient-to-b from-brand-50/95 to-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-brand-700">איך לגרום לזה באמת לעזור</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              {REVIEW_GUIDELINES.map((guideline) => (
                <li key={guideline}>{guideline}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50/80 p-5 shadow-panel">
            <p className="text-sm font-semibold text-rose-800">לפני שכותבים טקסט חופשי</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-rose-900">
              {EXPERIENCE_LEGAL_WARNING.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <p className="text-sm font-semibold text-brand-700">כמה מילים על החוויה</p>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מה עבד טוב בשבילך?</label>
                <textarea
                  {...register("pros")}
                  className="min-h-32 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="למשל: הוראה טובה, חשיפה טובה, תחושת תמיכה או קצב עבודה שעבד טוב."
                />
                {errors.pros ? <p className="mt-2 text-xs text-rose-600">{errors.pros.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מה היה מאתגר או כדאי לדעת מראש?</label>
                <textarea
                  {...register("cons")}
                  className="min-h-32 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="למשל: עומס, ליווי פחות צמוד, קצב מהיר או משהו שהיה עוזר לדעת מראש."
                />
                {errors.cons ? <p className="mt-2 text-xs text-rose-600">{errors.cons.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">{tipsLabelForType(reviewerType)}</label>
                <textarea
                  {...register("tips")}
                  className="min-h-32 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="טיפ אחד או שניים שהיו עוזרים גם לך בתחילת הדרך."
                />
                {errors.tips ? <p className="mt-2 text-xs text-rose-600">{errors.tips.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">למי המחלקה מתאימה לדעתך?</label>
                <textarea
                  {...register("roleDetails.fitForWho")}
                  className="min-h-28 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder={fitPlaceholderForType(reviewerType)}
                />
                {errors.roleDetails?.fitForWho ? (
                  <p className="mt-2 text-xs text-rose-600">{errors.roleDetails.fitForWho.message}</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
        <p className="text-sm font-semibold text-ink">רק לאשר ואפשר לשלוח</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm leading-7 text-slate-700">
            <input type="checkbox" className="mt-1" {...register("consentToContact")} />
            <span>אפשר ליצור איתי קשר רק אם השארתי טלפון ורק כדי לאמת את השיתוף.</span>
          </label>
          <label className="flex items-start gap-3 text-sm leading-7 text-slate-700">
            <input type="checkbox" className="mt-1" {...register("consentToTerms")} />
            <span>ברור לי שהשיתוף לא עולה אוטומטית ועובר בדיקה לפני פרסום.</span>
          </label>
          <label className="flex items-start gap-3 text-sm leading-7 text-slate-700">
            <input type="checkbox" className="mt-1" {...register("consentNoPatientInfo")} />
            <span>לא כללתי מידע מזהה על מטופלים, אנשי צוות או פרטים רגישים.</span>
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[1.5rem] bg-gradient-to-l from-brand-700 to-teal-600 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-300/40 transition hover:from-brand-800 hover:to-teal-700 disabled:opacity-60"
      >
        {isSubmitting ? "שולח/ת..." : "שליחת החוויה"}
      </button>
    </form>
  );
}
