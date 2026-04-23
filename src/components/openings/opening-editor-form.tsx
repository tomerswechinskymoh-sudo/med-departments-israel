"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { OPENING_ACCEPTANCE_CRITERIA_LABELS } from "@/lib/constants";
import { openingEditorSchema } from "@/lib/validation";

type FormValues = z.infer<typeof openingEditorSchema>;

export function OpeningEditorForm({
  departmentOptions,
  initialValues,
  openingId
}: {
  departmentOptions: Array<{
    id: string;
    name: string;
    institution: { name: string };
    specialty: { name: string };
  }>;
  initialValues?: Partial<FormValues>;
  openingId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(openingEditorSchema),
    defaultValues: {
      departmentId: initialValues?.departmentId ?? "",
      title: initialValues?.title ?? "",
      summary: initialValues?.summary ?? "",
      openingType: initialValues?.openingType ?? "RESIDENCY",
      isImmediate: initialValues?.isImmediate ?? false,
      openingsCount: initialValues?.openingsCount,
      topApplicantsToEmail: initialValues?.topApplicantsToEmail ?? 5,
      status: initialValues?.status ?? "OPEN",
      committeeDate: initialValues?.committeeDate ?? "",
      applicationDeadline: initialValues?.applicationDeadline ?? "",
      expectedStartDate: initialValues?.expectedStartDate ?? "",
      notes: initialValues?.notes ?? "",
      supportingInfo: initialValues?.supportingInfo ?? "",
      acceptanceCriteria: {
        researchImportance: initialValues?.acceptanceCriteria?.researchImportance ?? 3,
        departmentElectiveImportance:
          initialValues?.acceptanceCriteria?.departmentElectiveImportance ?? 3,
        departmentInternshipImportance:
          initialValues?.acceptanceCriteria?.departmentInternshipImportance ?? 3,
        residentSelectionInfluence:
          initialValues?.acceptanceCriteria?.residentSelectionInfluence ?? 3,
        specialistSelectionInfluence:
          initialValues?.acceptanceCriteria?.specialistSelectionInfluence ?? 3,
        departmentHeadInfluence: initialValues?.acceptanceCriteria?.departmentHeadInfluence ?? 3,
        medicalSchoolInfluence: initialValues?.acceptanceCriteria?.medicalSchoolInfluence ?? 3,
        recommendationsImportance:
          initialValues?.acceptanceCriteria?.recommendationsImportance ?? 3,
        personalFitImportance: initialValues?.acceptanceCriteria?.personalFitImportance ?? 3,
        previousDepartmentExperienceImportance:
          initialValues?.acceptanceCriteria?.previousDepartmentExperienceImportance ?? 3,
        notes: initialValues?.acceptanceCriteria?.notes ?? "",
        whatWeAreLookingFor: initialValues?.acceptanceCriteria?.whatWeAreLookingFor ?? ""
      }
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (key === "acceptanceCriteria") {
        Object.entries(value).forEach(([criteriaKey, criteriaValue]) => {
          if (criteriaValue !== undefined && criteriaValue !== null && criteriaValue !== "") {
            formData.set(`acceptanceCriteria.${criteriaKey}`, String(criteriaValue));
          }
        });
        return;
      }

      if (value !== undefined && value !== null && value !== "") {
        formData.set(key, String(value));
      }
    });

    if (attachment) {
      formData.set("attachment", attachment);
    }

    const endpoint = openingId
      ? `/api/representative/openings/${openingId}`
      : "/api/representative/openings";
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string; openingId?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "שמירת הפתיחה נכשלה.");
      return;
    }

    setMessage(payload?.message ?? "הפתיחה נשמרה.");
    router.push(`/representative/openings/${payload?.openingId ?? openingId}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">מחלקה</label>
          <select
            {...register("departmentId")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          >
            <option value="">בחירת מחלקה</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.institution.name} · {department.name} · {department.specialty.name}
              </option>
            ))}
          </select>
          {errors.departmentId ? (
            <p className="mt-2 text-xs text-rose-600">{errors.departmentId.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">סוג פתיחה</label>
          <select
            {...register("openingType")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          >
            <option value="RESIDENCY">תקן התמחות</option>
            <option value="FELLOWSHIP">פלו / מסלול המשך</option>
            <option value="ACADEMIC_TRACK">מסלול משולב מחקר / אקדמיה</option>
            <option value="COMMUNITY_TRACK">מסלול קהילה</option>
            <option value="OTHER">אחר</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("title")}
          placeholder="כותרת לפתיחה"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <select
          {...register("status")}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        >
          <option value="OPEN">פתוח</option>
          <option value="UPCOMING">צפוי להיפתח</option>
          <option value="CLOSED">סגור</option>
        </select>
      </div>

      <textarea
        {...register("summary")}
        placeholder="תקציר קצר וברור לסטודנטים וסטאז'רים: על מה הפתיחה, למי זה מתאים, ומה חשוב לדעת."
        className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
      />

      <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-950">
        <input type="checkbox" {...register("isImmediate")} />
        זו פתיחה מיידית שכרגע רלוונטית להגשה
      </label>

      <div className="grid gap-4 md:grid-cols-4">
        <input
          {...register("openingsCount")}
          type="number"
          min={0}
          placeholder="מספר תקנים"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">תאריך ועדה קרוב</label>
          <input
            {...register("committeeDate")}
            type="date"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">דדליין להגשה</label>
          <input
            {...register("applicationDeadline")}
            type="date"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">תאריך התחלה צפוי</label>
          <input
            {...register("expectedStartDate")}
            type="date"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-brand-100 bg-slate-50/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">אחרי שהדדליין עובר</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              המערכת תדרג את המועמדויות לפי מה שהגדרתם כאן, ותשלח לבעל/ת הפתיחה רק את ההתאמות הכי חזקות.
            </p>
          </div>
          <div className="min-w-[220px]">
            <label className="mb-2 block text-sm font-semibold text-ink">
              כמה מועמדים מובילים לשלוח במייל
            </label>
            <select
              {...register("topApplicantsToEmail")}
              className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
            {errors.topApplicantsToEmail ? (
              <p className="mt-2 text-xs text-rose-600">{errors.topApplicantsToEmail.message}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          {...register("notes")}
          placeholder="הערות לציבור: למשל יום חשיפה, תהליך, מה כדאי להכין."
          className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <textarea
          {...register("supportingInfo")}
          placeholder="מידע משלים: איך המחלקה רואה את הפתיחה, מה מחפשים, או מה כדאי לדעת לפני שמגישים."
          className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">מה חשוב למחלקה בבחירה?</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              המידע הזה יוצג למועמדים כדי לעזור להם להבין מה באמת משפיע במחלקה הספציפית.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {OPENING_ACCEPTANCE_CRITERIA_LABELS.map((item) => (
            <div key={item.key}>
              <label className="mb-2 block text-sm font-semibold text-ink">{item.label}</label>
              <select
                {...register(`acceptanceCriteria.${item.key}`)}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
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

        <textarea
          {...register("acceptanceCriteria.whatWeAreLookingFor")}
          placeholder="בשורה התחתונה, את מי אתם מחפשים? למשל סקרנות מחקרית, נוכחות קלינית, התאמה לצוות או ניסיון קודם."
          className="mt-4 min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />

        <textarea
          {...register("acceptanceCriteria.notes")}
          placeholder="הערה משלימה למועמדים: מה יכול לחזק מועמדות, או מה חשוב שתראו בטופס לפני הוועדה."
          className="mt-4 min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="rounded-[1.75rem] border border-brand-100 bg-white p-5">
        <p className="text-sm font-semibold text-ink">קובץ מצורף פנימי</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          אפשר לצרף קובץ פנימי לצוות המחלקה או לתהליך הבדיקה. הקובץ לא יוצג לציבור.
        </p>
        <input
          type="file"
          onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
          className="mt-4 block w-full text-sm text-slate-600 file:ml-4 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-semibold file:text-white"
        />
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שומר/ת..." : openingId ? "שמירת שינויים בפתיחה" : "פרסום פתיחה חדשה"}
      </button>
    </form>
  );
}
