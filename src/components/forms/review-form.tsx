"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  EXPERIENCE_PHONE_TRUST_COPY,
  EXPERIENCE_PRIVACY_COPY,
  REVIEW_GUIDELINES
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { reviewSubmissionSchema } from "@/lib/validation";

type FormValues = z.infer<typeof reviewSubmissionSchema>;

const roleOptions = [
  {
    value: "STUDENT" as const,
    label: "סטודנט/ית",
    description: "סבב, אלקטיב או יום חשיפה."
  },
  {
    value: "INTERN" as const,
    label: "סטאז׳ר/ית",
    description: "איך נראה הסבב בפועל."
  },
  {
    value: "RESIDENT" as const,
    label: "מתמחה/ה",
    description: "איך המחלקה מרגישה מבפנים."
  }
];

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
    institution: { name: string };
  }[];
  selectedDepartmentId?: string;
  initialReviewerType?: "RESIDENT" | "INTERN" | "STUDENT";
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
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
      consentToContact: true,
      consentToTerms: true,
      consentNoPatientInfo: true
    }
  });

  useEffect(() => {
    setValue("reviewerType", initialReviewerType);
  }, [initialReviewerType, setValue]);

  const reviewerType = watch("reviewerType");
  const isAnonymous = watch("isAnonymous");

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
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
      consentToContact: true,
      consentToTerms: true,
      consentNoPatientInfo: true
    });
    router.refresh();
    onSubmitted?.();
  });

  const ratingFields = [
    { name: "teachingQuality", label: "הוראה" },
    { name: "workAtmosphere", label: "אווירה" },
    { name: "seniorsApproachability", label: "נגישות בכירים" },
    { name: "researchExposure", label: "מחקר" },
    { name: "lifestyleBalance", label: "עומס מול חיים" },
    { name: "overallRecommendation", label: "שווה להמליץ?" }
  ] as const;

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
                  לא צריך ניסוח מושלם. רק לשתף מה באמת קרה שם, בצורה שתעזור למי שמגיע/ה
                  אחריך.
                </p>
              </div>
            </div>

            <input type="hidden" {...register("reviewerType")} />

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setValue("reviewerType", role.value, { shouldValidate: true })}
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
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-ink">מוסד ומחלקה</label>
              <select
                {...register("departmentId")}
                className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
              >
                <option value="">בחירת מחלקה</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.institution.name} · {department.name}
                  </option>
                ))}
              </select>
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
                  placeholder={isAnonymous ? "רק אם תרצה/י להופיע בשם" : "זה השם שיופיע באתר"}
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
                <label className="mb-2 block text-sm font-semibold text-ink">טלפון</label>
                <input
                  {...register("phone")}
                  className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="רק לאימות"
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
            <p className="text-sm font-semibold text-brand-700">בכמה מילים ובכמה מספרים</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {ratingFields.map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-semibold text-ink">{field.label}</label>
                  <select
                    {...register(field.name, { valueAsNumber: true })}
                    className="w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
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

          <section className="rounded-[1.75rem] border border-brand-100/80 bg-white/92 p-5 shadow-panel">
            <p className="text-sm font-semibold text-brand-700">החלק של הטקסט</p>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מה עבד טוב בשבילך?</label>
                <textarea
                  {...register("pros")}
                  className="min-h-32 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="למשל: הוראה טובה, מקום לשאול, אווירה טובה בצוות, חשיפה טובה למקרים."
                />
                {errors.pros ? <p className="mt-2 text-xs text-rose-600">{errors.pros.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מה פחות עבד, או מה כדאי לדעת מראש?</label>
                <textarea
                  {...register("cons")}
                  className="min-h-32 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="למשל: עומס גבוה, פחות מקום ליוזמה, קצב מהיר או משהו שחשוב להגיע אליו מוכנים."
                />
                {errors.cons ? <p className="mt-2 text-xs text-rose-600">{errors.cons.message}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">מה היית אומר/ת למישהו שמגיע לשם מחר?</label>
                <textarea
                  {...register("tips")}
                  className="min-h-32 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 outline-none transition focus:border-brand-300"
                  placeholder="טיפ אחד או שניים שיכלו לעזור גם לך ביום הראשון."
                />
                {errors.tips ? <p className="mt-2 text-xs text-rose-600">{errors.tips.message}</p> : null}
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
            <span>אפשר ליצור איתי קשר רק אם צריך כדי לאמת את השיתוף.</span>
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
