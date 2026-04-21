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
import { reviewSubmissionSchema } from "@/lib/validation";

type FormValues = z.infer<typeof reviewSubmissionSchema>;

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
      setMessage(payload?.error ?? "שליחת החוויה נכשלה.");
      return;
    }

    setMessage(payload?.message ?? "החוויה התקבלה לבדיקה.");
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
    { name: "teachingQuality", label: "איכות ההוראה" },
    { name: "workAtmosphere", label: "אווירת העבודה" },
    { name: "seniorsApproachability", label: "נגישות הבכירים" },
    { name: "researchExposure", label: "חשיפה למחקר" },
    { name: "lifestyleBalance", label: "איזון עומס / חיים" },
    { name: "overallRecommendation", label: "האם היית ממליץ/ה לאחרים?" }
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className={compact ? "grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" : "space-y-6"}>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">מוסד ומחלקה</label>
              <select
                {...register("departmentId")}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">סוג ההגשה</label>
              <select
                {...register("reviewerType")}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
              >
                <option value="RESIDENT">מתמחה</option>
                <option value="INTERN">סטאז'ר/ית</option>
                <option value="STUDENT">סטודנט/ית</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">שם מלא</label>
              <input
                {...register("fullName")}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder={isAnonymous ? "אופציונלי" : "כדי להופיע בשם מלא בפרסום"}
              />
              {!isAnonymous ? (
                <p className="mt-2 text-xs text-slate-500">
                  אם בוחרים פרסום בשם מלא, זה השם שיופיע לציבור אחרי אישור.
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
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="נשמר פרטי לצורך אימות"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">{EXPERIENCE_PHONE_TRUST_COPY}</p>
              {errors.phone ? <p className="mt-2 text-xs text-rose-600">{errors.phone.message}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
              <input
                {...register("email")}
                type="email"
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="אופציונלי"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">{EXPERIENCE_PRIVACY_COPY}</p>
              {errors.email ? <p className="mt-2 text-xs text-rose-600">{errors.email.message}</p> : null}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" {...register("isAnonymous")} />
            <span>
              <span className="block font-semibold text-amber-950">אני רוצה להישאר אנונימי/ת בפומבי</span>
              <span className="mt-1 block leading-6">
                אם תבחרו באנונימיות, הפוסט הציבורי לא יציג שם, טלפון או פרטי קשר.
              </span>
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {ratingFields.map((field) => (
              <div key={field.name}>
                <label className="mb-2 block text-sm font-semibold text-ink">{field.label}</label>
                <select
                  {...register(field.name, { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
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
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/70 p-5">
            <p className="text-sm font-semibold text-brand-700">איך לכתוב חוויה שעוזרת לאחרים</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              {REVIEW_GUIDELINES.map((guideline) => (
                <li key={guideline}>{guideline}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">מה היה טוב בחוויה?</label>
              <textarea
                {...register("pros")}
                className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="למשל: הוראה, אווירה, יחס, מקום ליוזמה, סגנון עבודה."
              />
              {errors.pros ? <p className="mt-2 text-xs text-rose-600">{errors.pros.message}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">מה היה מאתגר או פחות עבד?</label>
              <textarea
                {...register("cons")}
                className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="אפשר להיות ישירים אבל ענייניים, בלי ניסוחים פוגעניים."
              />
              {errors.cons ? <p className="mt-2 text-xs text-rose-600">{errors.cons.message}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">מה היית ממליץ/ה למי שמגיע/ה לשם?</label>
              <textarea
                {...register("tips")}
                className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
                placeholder="טיפים מעשיים: איך להתכונן, למה לשים לב, ממה להפיק הכי הרבה."
              />
              {errors.tips ? <p className="mt-2 text-xs text-rose-600">{errors.tips.message}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-brand-100 bg-white p-5">
        <p className="text-sm font-semibold text-ink">אישורים לפני שליחה</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" {...register("consentToContact")} />
            <span>אני מאשר/ת ליצור איתי קשר לצורך אימות החוויה בלבד.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" {...register("consentToTerms")} />
            <span>אני מבין/ה שההגשה לא מתפרסמת אוטומטית ותעבור בדיקה לפני פרסום.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" {...register("consentNoPatientInfo")} />
            <span>אני מאשר/ת שלא כללתי מידע מזהה על מטופלים, אנשי צוות או מידע רגיש.</span>
          </label>
        </div>
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-200/60 disabled:opacity-60"
      >
        {isSubmitting ? "שולח/ת..." : "שליחת החוויה לבדיקה"}
      </button>
    </form>
  );
}
