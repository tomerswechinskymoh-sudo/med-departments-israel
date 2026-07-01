"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { MEDICAL_FACULTY_OPTIONS } from "@/lib/constants";
import {
  getExperienceContributionEligibility,
  type ExperienceContributionCategory,
  type StudentTrack
} from "@/lib/onboarding-contribution";
import { signupSchema } from "@/lib/validation";
import { ReviewForm } from "@/components/forms/review-form";

type RoleStatus = "medical_student" | "intern" | "resident" | "specialist" | "other";
type ContributionStatus = "not_eligible" | "submitted" | "skipped";
type MedicalFaculty = (typeof MEDICAL_FACULTY_OPTIONS)[number];

type DepartmentOption = {
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
};

type FormValues = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  roleStatus: RoleStatus;
  proofConfirmed: boolean;
  marketingConsent: boolean;
  privacyVerificationConsent: boolean;
  studentTrack?: StudentTrack | "";
  studentYear?: number | string;
  medicalFaculty?: MedicalFaculty | "";
  onboardingInstitutionId?: string;
  onboardingDepartmentId?: string;
  experienceContributionStatus?: ContributionStatus;
  experienceContributionCategory?: ExperienceContributionCategory;
};

const roleStatusOptions: Array<{ value: RoleStatus; label: string }> = [
  {
    value: "medical_student",
    label: "סטודנט/ית לרפואה"
  },
  {
    value: "intern",
    label: "סטאז׳ר/ית"
  },
  {
    value: "resident",
    label: "מתמחה"
  },
  {
    value: "specialist",
    label: "רופא/ה מומחה/ית"
  },
  {
    value: "other",
    label: "לא במקצוע רפואי / אחר"
  }
];

const studentTrackOptions = [
  { value: "six_year", label: "מסלול 6 שנתי" },
  { value: "four_year", label: "מסלול 4 שנתי" }
] as const;

const studentYearOptions = Array.from({ length: 7 }, (_, index) => index + 1);

const onboardingContributionCopy =
  "האתר נבנה כדי לעזור לסטודנטים, סטאז׳רים ומתמחים לבחור התמחות ומחלקה בצורה שקופה יותר.\nכמו שהמידע כאן עוזר לך, נשמח שגם תחזיר/י ידע לקהילה ותשתף/י חוויה ממחלקה שבה היית.\nהחוויה אנונימית כברירת מחדל, אלא אם תבחר/י אחרת.";

function normalizeOptional(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function SignupForm({ departments }: { departments: DepartmentOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "experience">("account");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const [verificationProof, setVerificationProof] = useState<File | null>(null);
  const [experienceSubmitted, setExperienceSubmitted] = useState(false);
  const [careerContextError, setCareerContextError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      roleStatus: "medical_student",
      proofConfirmed: false,
      marketingConsent: false,
      privacyVerificationConsent: false,
      studentTrack: "",
      studentYear: "",
      medicalFaculty: "",
      onboardingInstitutionId: "",
      onboardingDepartmentId: ""
    }
  });

  const roleStatus = watch("roleStatus");
  const studentTrack = watch("studentTrack");
  const studentYear = watch("studentYear");
  const selectedInstitutionId = watch("onboardingInstitutionId");
  const selectedDepartmentId = watch("onboardingDepartmentId");
  const fullName = watch("fullName");
  const email = watch("email");
  const phone = watch("phone");
  const medicalFaculty = watch("medicalFaculty");

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
      ).sort((left, right) => left.name.localeCompare(right.name, "he")),
    [departments]
  );

  const availableDepartments = useMemo(
    () =>
      departments
        .filter((department) => department.institution.id === selectedInstitutionId)
        .sort((left, right) => {
          const specialtyCompare = left.specialty.name.localeCompare(right.specialty.name, "he");
          return specialtyCompare || left.name.localeCompare(right.name, "he");
        }),
    [departments, selectedInstitutionId]
  );

  useEffect(() => {
    if (!selectedDepartmentId) return;
    const departmentStillValid = availableDepartments.some(
      (department) => department.id === selectedDepartmentId
    );
    if (!departmentStillValid) {
      setValue("onboardingDepartmentId", "");
    }
  }, [availableDepartments, selectedDepartmentId, setValue]);

  const contributionEligibility = getExperienceContributionEligibility({
    roleStatus,
    studentTrack,
    studentYear
  });

  const initialRoleDetails = useMemo(
    () => ({
      medicalSchool: medicalFaculty || undefined,
      studentTrack: roleStatus === "medical_student" ? studentTrack || undefined : undefined,
      studentYear:
        roleStatus === "medical_student" && studentYear
          ? Number(studentYear)
          : undefined,
      contributionCategory: contributionEligibility.category ?? undefined
    }),
    [contributionEligibility.category, medicalFaculty, roleStatus, studentTrack, studentYear]
  );

  function validateCareerContext(values: FormValues) {
    if (values.roleStatus === "medical_student") {
      if (!values.studentTrack) return "יש לבחור מסלול לימודים.";
      if (!values.studentYear) return "יש לבחור שנת לימוד.";
      if (!values.medicalFaculty) return "יש לבחור פקולטה לרפואה.";
      return null;
    }

    if (values.roleStatus === "intern") {
      if (!values.onboardingInstitutionId) return "יש לבחור בית חולים לסטאז׳ או לסבב.";
      return null;
    }

    if (values.roleStatus === "resident" || values.roleStatus === "specialist") {
      if (!values.onboardingInstitutionId) return "יש לבחור בית חולים.";
      if (!values.onboardingDepartmentId) return "יש לבחור מחלקה.";
      return null;
    }

    return null;
  }

  async function createAccount(values: FormValues, contributionStatus: ContributionStatus) {
    setFormError(null);
    setCareerContextError(null);
    setSuccessMessage(null);
    setDevVerificationUrl(null);

    if (!verificationProof) {
      setFormError("יש להעלות אישור לצורך אימות.");
      setStep("account");
      return;
    }

    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("phone", values.phone ?? "");
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    formData.set("roleStatus", values.roleStatus);
    formData.set("proofConfirmed", String(values.proofConfirmed));
    formData.set("marketingConsent", String(values.marketingConsent));
    formData.set("privacyVerificationConsent", String(values.privacyVerificationConsent));
    formData.set("verificationProof", verificationProof);
    formData.set("studentTrack", values.studentTrack ?? "");
    formData.set("studentYear", normalizeOptional(values.studentYear));
    formData.set("medicalFaculty", values.medicalFaculty ?? "");
    formData.set("onboardingInstitutionId", values.onboardingInstitutionId ?? "");
    formData.set("onboardingDepartmentId", values.onboardingDepartmentId ?? "");
    formData.set("experienceContributionStatus", contributionStatus);
    formData.set("experienceContributionCategory", contributionEligibility.category ?? "");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
      verificationUrl?: string;
    } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "ההרשמה נכשלה.");
      setStep("account");
      return;
    }

    if (!payload?.verificationUrl) {
      router.push("/departments?signup=checkEmail");
      router.refresh();
      return;
    }

    setSuccessMessage(
      payload.message ??
        "ההרשמה התקבלה. בדקו את המייל כדי לאמת את החשבון, ולאחר מכן הבקשה תעבור לאישור."
    );
    setDevVerificationUrl(payload.verificationUrl);
    router.refresh();
  }

  const submitAccount = handleSubmit(async (values) => {
    const contextError = validateCareerContext(values);
    if (contextError) {
      setCareerContextError(contextError);
      return;
    }

    setCareerContextError(null);

    if (!verificationProof) {
      setFormError("יש להעלות אישור לצורך אימות.");
      return;
    }

    if (contributionEligibility.eligible && !experienceSubmitted) {
      setStep("experience");
      return;
    }

    await createAccount(values, contributionEligibility.eligible ? "submitted" : "not_eligible");
  });

  function completeAfterSkip() {
    void handleSubmit(async (values) => {
      const contextError = validateCareerContext(values);
      if (contextError) {
        setCareerContextError(contextError);
        setStep("account");
        return;
      }

      await createAccount(values, "skipped");
    })();
  }

  function completeAfterContribution() {
    void handleSubmit(async (values) => {
      await createAccount(values, "submitted");
    })();
  }

  if (successMessage) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 text-sm leading-7 text-emerald-900">
        <p className="font-bold">ההרשמה התקבלה</p>
        <p>{successMessage}</p>
        {devVerificationUrl ? (
          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3">
            <p className="font-bold">סביבת פיתוח: ניתן לאמת את המייל דרך הקישור הבא</p>
            <a
              href={devVerificationUrl}
              className="mt-2 block break-all font-semibold text-brand-800 underline underline-offset-4"
            >
              {devVerificationUrl}
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  if (step === "experience") {
    return (
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/70 p-5 text-sm leading-8 text-slate-700">
          <p className="text-base font-black text-ink">שיתוף ידע לקהילה</p>
          {onboardingContributionCopy.split("\n").map((line) => (
            <p key={line} className="mt-2">
              {line}
            </p>
          ))}
        </div>

        {experienceSubmitted ? (
          <div className="space-y-4 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5 text-sm leading-7 text-emerald-900">
            <p className="font-black">תודה, החוויה נשלחה לבדיקה.</p>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={completeAfterContribution}
              className="rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {isSubmitting ? "משלים/ה הרשמה..." : "המשך להרשמה"}
            </button>
          </div>
        ) : (
          <ReviewForm
            departments={departments}
            selectedDepartmentId={selectedDepartmentId}
            initialInstitutionId={selectedInstitutionId}
            initialReviewerType={contributionEligibility.reviewerType ?? "INTERN"}
            initialContact={{
              fullName,
              phone,
              email
            }}
            initialRoleDetails={initialRoleDetails}
            lockReviewerType
            verificationAlreadyProvided
            initialVerificationDocument={verificationProof}
            onSubmitted={() => setExperienceSubmitted(true)}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setStep("account")}
            className="rounded-full border border-brand-100 px-5 py-3 text-sm font-bold text-brand-800 transition hover:bg-brand-50"
          >
            חזרה לפרטי ההרשמה
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={completeAfterSkip}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            אין לי חוויה לשתף כרגע
          </button>
        </div>

        {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submitAccount} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">שם מלא</label>
        <input
          {...register("fullName")}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
        {errors.fullName ? (
          <p className="mt-2 text-xs text-rose-600">{errors.fullName.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
          <input
            {...register("email")}
            type="email"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.email ? <p className="mt-2 text-xs text-rose-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">טלפון</label>
          <input
            {...register("phone")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.phone ? <p className="mt-2 text-xs text-rose-600">{errors.phone.message}</p> : null}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
        <label className="mb-3 block text-sm font-semibold text-ink">סטטוס מקצועי</label>
        <div className="grid gap-3 md:grid-cols-2">
          {roleStatusOptions.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm leading-6 text-slate-700 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50"
            >
              <input
                {...register("roleStatus")}
                type="radio"
                value={option.value}
                className="h-4 w-4 border-brand-200 text-brand-700"
              />
              <span>
                <span className="block font-black text-ink">{option.label}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.roleStatus ? (
          <p className="mt-2 text-xs text-rose-600">{errors.roleStatus.message}</p>
        ) : null}
      </div>

      {roleStatus === "medical_student" ? (
        <div className="grid gap-4 rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">מסלול לימודים</span>
            <select
              {...register("studentTrack")}
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
            >
              <option value="">בחירת מסלול</option>
              {studentTrackOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">שנת לימוד</span>
            <select
              {...register("studentYear")}
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
            >
              <option value="">בחירת שנה</option>
              {studentYearOptions.map((year) => (
                <option key={year} value={year}>
                  שנה {year}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">פקולטה</span>
            <select
              {...register("medicalFaculty")}
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
            >
              <option value="">בחירת פקולטה</option>
              {MEDICAL_FACULTY_OPTIONS.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {roleStatus === "intern" || roleStatus === "resident" || roleStatus === "specialist" ? (
        <div className="grid gap-4 rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">
              {roleStatus === "intern" ? "בית חולים" : "בית חולים נוכחי או אחרון"}
            </span>
            <select
              {...register("onboardingInstitutionId")}
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
            >
              <option value="">בחירת בית חולים</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </label>

          {roleStatus === "resident" || roleStatus === "specialist" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">מחלקה נוכחית או אחרונה</span>
              <select
                {...register("onboardingDepartmentId")}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
              >
                <option value="">בחירת מחלקה</option>
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} · {department.specialty.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {careerContextError ? <p className="text-sm text-rose-600">{careerContextError}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">סיסמה</label>
          <input
            {...register("password")}
            type="password"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.password ? (
            <p className="mt-2 text-xs text-rose-600">{errors.password.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">אימות סיסמה</label>
          <input
            {...register("confirmPassword")}
            type="password"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.confirmPassword ? (
            <p className="mt-2 text-xs text-rose-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
        <label className="mb-2 block text-sm font-semibold text-ink">אישור סטטוס מקצועי</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(event) => setVerificationProof(event.target.files?.[0] ?? null)}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition file:me-3 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-brand-300"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          אפשר להעלות PDF, JPG או PNG עד 5MB.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        <input
          {...register("proofConfirmed")}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-brand-200 text-brand-700"
        />
        <span>אני מאשר/ת שהמסמך נכון ומשמש לצורכי אימות בלבד.</span>
      </label>
      {errors.proofConfirmed ? (
        <p className="text-xs text-rose-600">{errors.proofConfirmed.message}</p>
      ) : null}

      <label className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        <input
          {...register("privacyVerificationConsent")}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-brand-200 text-brand-700"
        />
        <span>אני מאשר/ת את תנאי השימוש, מדיניות הפרטיות ושמירת המידע לצורכי אימות</span>
      </label>
      {errors.privacyVerificationConsent ? (
        <p className="text-xs text-rose-600">{errors.privacyVerificationConsent.message}</p>
      ) : null}

      <label className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        <input
          {...register("marketingConsent")}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-brand-200 text-brand-700"
        />
        <span>
          <span className="block font-semibold text-ink">אני מאשר/ת קבלת עדכונים במייל</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">
            אני מאשר/ת לאתר לאסוף את פרטיי ולשלוח אליי עדכונים, חידושים, משרות חדשות, הודעות מערכת ותוכן שיווקי.
          </span>
        </span>
      </label>

      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting
          ? "ממשיך/ה..."
          : contributionEligibility.eligible
            ? "המשך לשיתוף חוויה"
            : "יצירת חשבון"}
      </button>
    </form>
  );
}
