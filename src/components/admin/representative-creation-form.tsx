"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminRepresentativeCreateSchema } from "@/lib/validation";

type FormValues = z.infer<typeof adminRepresentativeCreateSchema>;

export function RepresentativeCreationForm({
  departments
}: {
  departments: Array<{
    id: string;
    name: string;
    specialty: { name: string };
    institution: { id: string; name: string; type: "HOSPITAL" | "HMO" };
  }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    setValue,
    watch,
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(adminRepresentativeCreateSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      institutionId: "",
      departmentIds: [],
      profile: {
        title: "",
        contactDetails: "",
        note: ""
      }
    }
  });
  const selectedInstitutionId = watch("institutionId");
  const selectedDepartmentIds = watch("departmentIds");
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
  const visibleDepartments = departments.filter(
    (department) => department.institution.id === selectedInstitutionId
  );

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/admin/representatives", {
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
    if (response.ok) {
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("fullName")}
          placeholder="שם מלא"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <input
          {...register("email")}
          type="email"
          placeholder="אימייל"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("phone")}
          placeholder="טלפון"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <input
          {...register("password")}
          type="password"
          placeholder="סיסמה זמנית"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("profile.title")}
          placeholder="טייטל / תפקיד"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <textarea
          {...register("profile.contactDetails")}
          placeholder="פרטי קשר ציבוריים"
          className="min-h-24 rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <textarea
        {...register("profile.note")}
        placeholder="כמה מילים על התפקיד או על תחום האחריות"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
      />

      <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/70 p-5">
        <p className="text-sm font-semibold text-ink">שיוך למחלקות</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          נציג/ה חייב/ת להיות משויך/ת לפחות למחלקה אחת. רק המחלקות האלו יהיו זמינות לניהול תוכן.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">שלב 1</p>
            <label className="mt-2 block text-sm font-semibold text-ink">בחירת מוסד</label>
            <select
              {...register("institutionId")}
              onChange={(event) => {
                setValue("institutionId", event.target.value, { shouldValidate: true });
                setValue("departmentIds", [], { shouldValidate: true });
              }}
              className="mt-3 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">בחירת מוסד</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name} · {institution.type === "HOSPITAL" ? "בית חולים" : "קופת חולים / קהילה"}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">שלב 2</p>
            <p className="mt-2 text-sm font-semibold text-ink">מחלקות זמינות במוסד</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleDepartments.map((department) => (
                <label
                  key={department.id}
                  className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartmentIds.includes(department.id)}
                    onChange={() =>
                      setValue(
                        "departmentIds",
                        selectedDepartmentIds.includes(department.id)
                          ? selectedDepartmentIds.filter((departmentId) => departmentId !== department.id)
                          : [...selectedDepartmentIds, department.id],
                        { shouldValidate: true }
                      )
                    }
                  />
                  <span>
                    {department.name}
                    <span className="mt-1 block text-xs text-slate-500">{department.specialty.name}</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedInstitutionId && visibleDepartments.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">לא נמצאו מחלקות זמינות במוסד שנבחר.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-rose-600">
        {errors.fullName ? <p>{errors.fullName.message}</p> : null}
        {errors.email ? <p>{errors.email.message}</p> : null}
        {errors.password ? <p>{errors.password.message}</p> : null}
        {errors.institutionId ? <p>{errors.institutionId.message}</p> : null}
        {errors.departmentIds ? <p>{errors.departmentIds.message as string}</p> : null}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "יוצר/ת..." : "יצירת נציג/ת מחלקה"}
      </button>
    </form>
  );
}
