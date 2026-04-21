"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { departmentEditorSchema } from "@/lib/validation";

type FormValues = z.infer<typeof departmentEditorSchema>;

export function DepartmentEditorForm({
  initialValues
}: {
  initialValues: FormValues & {
    departmentName: string;
    institutionName: string;
    specialtyName: string;
  };
}) {
  const [message, setMessage] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(departmentEditorSchema),
    defaultValues: initialValues
  });

  const heads = useFieldArray({ control, name: "heads" });
  const updates = useFieldArray({ control, name: "officialUpdates" });
  const research = useFieldArray({ control, name: "researchOpportunities" });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch(`/api/representative/departments/${values.departmentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    setMessage(payload?.message ?? payload?.error ?? null);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-[2rem] border border-brand-100 bg-brand-50/80 p-5">
        <p className="text-sm font-semibold text-brand-700">עמוד ציבורי לסטודנטים וסטאז'רים</p>
        <h3 className="mt-2 text-2xl font-bold text-ink">{initialValues.departmentName}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {initialValues.institutionName} · {initialValues.specialtyName}
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">תקציר קצר</label>
          <textarea
            {...register("shortSummary")}
            className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">על המחלקה</label>
          <textarea
            {...register("about")}
            className="min-h-36 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            מידע פרקטי לסטודנטים וסטאז'רים
          </label>
          <textarea
            {...register("practicalInfo")}
            className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("publicContactEmail")}
          placeholder="אימייל ציבורי"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <input
          {...register("publicContactPhone")}
          placeholder="טלפון ציבורי"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="rounded-[2rem] border border-brand-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-ink">ראשי המחלקה</h4>
          <button
            type="button"
            onClick={() => heads.append({ name: "", title: "", bio: "", profileImageUrl: "" })}
            className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            הוספת ראש/ת מחלקה
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {heads.fields.map((field, index) => (
            <div key={field.id} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  {...register(`heads.${index}.name`)}
                  placeholder="שם"
                  className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
                />
                <input
                  {...register(`heads.${index}.title`)}
                  placeholder="תפקיד"
                  className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
                />
              </div>
              <textarea
                {...register(`heads.${index}.bio`)}
                placeholder="ביוגרפיה קצרה"
                className="mt-4 min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <input
                {...register(`heads.${index}.profileImageUrl`)}
                placeholder="קישור אופציונלי לתמונה"
                className="mt-4 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={() => heads.remove(index)}
                className="mt-4 text-sm font-semibold text-rose-700"
              >
                הסרה
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-brand-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-ink">עדכוני מחלקה רשמיים</h4>
          <button
            type="button"
            onClick={() => updates.append({ title: "", body: "" })}
            className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            הוספת עדכון
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {updates.fields.map((field, index) => (
            <div key={field.id} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <input
                {...register(`officialUpdates.${index}.title`)}
                placeholder="כותרת"
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <textarea
                {...register(`officialUpdates.${index}.body`)}
                placeholder="תוכן"
                className="mt-4 min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={() => updates.remove(index)}
                className="mt-4 text-sm font-semibold text-rose-700"
              >
                הסרה
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-brand-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-ink">הזדמנויות מחקר</h4>
          <button
            type="button"
            onClick={() =>
              research.append({
                title: "",
                summary: "",
                description: "",
                contactInfo: ""
              })
            }
            className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            הוספת הזדמנות
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {research.fields.map((field, index) => (
            <div key={field.id} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <input
                {...register(`researchOpportunities.${index}.title`)}
                placeholder="כותרת"
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <input
                {...register(`researchOpportunities.${index}.summary`)}
                placeholder="תקציר"
                className="mt-4 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <textarea
                {...register(`researchOpportunities.${index}.description`)}
                placeholder="תיאור מלא"
                className="mt-4 min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <input
                {...register(`researchOpportunities.${index}.contactInfo`)}
                placeholder="פרטי קשר"
                className="mt-4 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={() => research.remove(index)}
                className="mt-4 text-sm font-semibold text-rose-700"
              >
                הסרה
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1 text-sm text-rose-600">
        {errors.shortSummary ? <p>{errors.shortSummary.message}</p> : null}
        {errors.about ? <p>{errors.about.message}</p> : null}
        {errors.practicalInfo ? <p>{errors.practicalInfo.message}</p> : null}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שומר/ת..." : "שמירת עמוד המחלקה"}
      </button>
    </form>
  );
}
