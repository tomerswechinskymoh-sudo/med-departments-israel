"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { APPLICATION_PRIVACY_COPY } from "@/lib/constants";
import { openingApplicationSchema } from "@/lib/validation";

type FormValues = z.infer<typeof openingApplicationSchema>;

export function OpeningApplicationForm({
  openingId,
  initialValues
}: {
  openingId: string;
  initialValues?: Partial<FormValues>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(openingApplicationSchema),
    defaultValues: {
      openingId,
      applicantType: initialValues?.applicantType ?? "INTERN",
      fullName: initialValues?.fullName ?? "",
      phone: initialValues?.phone ?? "",
      email: initialValues?.email ?? "",
      medicalSchool: initialValues?.medicalSchool ?? "",
      didDepartmentElective: false,
      departmentElectiveDetails: "",
      hasResearch: false,
      researchDetails: "",
      didInternshipThere: false,
      internshipDetails: "",
      recommendationDetails: "",
      departmentFamiliarityDetails: "",
      motivationText: "",
      relevantExperience: "",
      additionalNotes: ""
    }
  });

  const didDepartmentElective = watch("didDepartmentElective");
  const hasResearch = watch("hasResearch");
  const didInternshipThere = watch("didInternshipThere");

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    if (!cvFile) {
      setMessage("יש לצרף קורות חיים כדי להשלים את ההגשה.");
      return;
    }

    const formData = new FormData();
    formData.set("openingId", openingId);
    formData.set("applicantType", values.applicantType);
    formData.set("fullName", values.fullName.trim());
    formData.set("phone", values.phone.trim());

    if (values.email?.trim()) {
      formData.set("email", values.email.trim());
    }

    formData.set("medicalSchool", values.medicalSchool.trim());
    formData.set("didDepartmentElective", String(values.didDepartmentElective));
    formData.set("hasResearch", String(values.hasResearch));
    formData.set("didInternshipThere", String(values.didInternshipThere));

    if (values.departmentElectiveDetails?.trim()) {
      formData.set("departmentElectiveDetails", values.departmentElectiveDetails.trim());
    }

    if (values.researchDetails?.trim()) {
      formData.set("researchDetails", values.researchDetails.trim());
    }

    if (values.internshipDetails?.trim()) {
      formData.set("internshipDetails", values.internshipDetails.trim());
    }

    if (values.recommendationDetails?.trim()) {
      formData.set("recommendationDetails", values.recommendationDetails.trim());
    }

    if (values.departmentFamiliarityDetails?.trim()) {
      formData.set("departmentFamiliarityDetails", values.departmentFamiliarityDetails.trim());
    }

    formData.set("motivationText", values.motivationText.trim());
    formData.set("relevantExperience", values.relevantExperience.trim());

    if (values.additionalNotes?.trim()) {
      formData.set("additionalNotes", values.additionalNotes.trim());
    }

    formData.set("cvFile", cvFile);

    if (profilePhoto) {
      formData.set("profilePhoto", profilePhoto);
    }

    if (supportingFile) {
      formData.set("supportingFile", supportingFile);
    }

    const response = await fetch(`/api/openings/${openingId}/applications`, {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "שליחת המועמדות נכשלה.");
      return;
    }

    setMessage(payload?.message ?? "המועמדות התקבלה.");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <select
          {...register("applicantType")}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        >
          <option value="RESIDENT">מתמחה</option>
          <option value="INTERN">סטאז'ר/ית</option>
          <option value="STUDENT">סטודנט/ית</option>
        </select>
        <input
          {...register("fullName")}
          placeholder="שם מלא"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <input
          {...register("phone")}
          placeholder="טלפון"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <input
        {...register("email")}
        type="email"
        placeholder="אימייל (אופציונלי)"
        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
      />

      <input
        {...register("medicalSchool")}
        placeholder="איפה למדת / את לומדת רפואה?"
        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
      />

      <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/70 p-5">
        <p className="text-sm font-semibold text-brand-700">מידע שיעזור למחלקה להבין את ההתאמה שלך</p>
        <div className="mt-5 space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" {...register("didDepartmentElective")} />
            עשיתי אלקטיב במחלקה
          </label>
          {didDepartmentElective ? (
            <textarea
              {...register("departmentElectiveDetails")}
              placeholder="כמה זמן, מה עשית, ומה למדת מזה"
              className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
            />
          ) : null}

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" {...register("hasResearch")} />
            יש לי מחקרים או פעילות אקדמית רלוונטית
          </label>
          {hasResearch ? (
            <textarea
              {...register("researchDetails")}
              placeholder="מאמרים, עבודות, פרויקטים או תחום עניין מחקרי"
              className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
            />
          ) : null}

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" {...register("didInternshipThere")} />
            הייתי בסטאז׳ / סבב במחלקה
          </label>
          {didInternshipThere ? (
            <textarea
              {...register("internshipDetails")}
              placeholder="איזה סבב עשית ומה הוא תרם להבנה שלך על המחלקה"
              className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
            />
          ) : null}

          <textarea
            {...register("departmentFamiliarityDetails")}
            placeholder="אם יש לך היכרות נוספת עם המחלקה, עם הצוות או עם אופי העבודה שם, זה המקום לכתוב."
            className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />

          <textarea
            {...register("recommendationDetails")}
            placeholder="יש המלצות, חונכים או אנשי צוות שמכירים אותך מקצועית? אפשר לציין כאן בקצרה."
            className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          {...register("motivationText")}
          placeholder="למה המחלקה הזאת מעניינת אותך, ומה מושך אותך דווקא למסלול הזה?"
          className="min-h-36 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <textarea
          {...register("relevantExperience")}
          placeholder="מה כבר עשית שיכול לעזור להבין את ההתאמה שלך למחלקה?"
          className="min-h-36 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <textarea
        {...register("additionalNotes")}
        placeholder="הערות נוספות שחשוב למחלקה לדעת"
        className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
      />

      <div className="rounded-[1.75rem] border border-brand-100 bg-white p-5">
        <p className="text-sm font-semibold text-ink">קבצים פרטיים למחלקה</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{APPLICATION_PRIVACY_COPY}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">קורות חיים</label>
            <input
              type="file"
              onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:ml-4 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">תמונת פרופיל</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:ml-4 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:font-semibold file:text-slate-700"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">קובץ נוסף</label>
            <input
              type="file"
              onChange={(event) => setSupportingFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:ml-4 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:font-semibold file:text-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-rose-600">
        {Object.values(errors).map((error) =>
          error?.message ? <p key={error.message}>{error.message}</p> : null
        )}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שולח/ת..." : "שליחת מועמדות"}
      </button>
    </form>
  );
}
