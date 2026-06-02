"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signupSchema } from "@/lib/validation";

type RoleStatus = "medical_student" | "intern" | "resident" | "specialist" | "other";

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
};

const roleStatusOptions: Array<{ value: RoleStatus; label: string }> = [
  { value: "medical_student", label: "סטודנט/ית לרפואה" },
  { value: "intern", label: "סטאז'ר/ית" },
  { value: "resident", label: "מתמחה" },
  { value: "specialist", label: "מומחה/ית" },
  { value: "other", label: "אחר" }
];

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const [verificationProof, setVerificationProof] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
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
      privacyVerificationConsent: false
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);
    setDevVerificationUrl(null);

    if (!verificationProof) {
      setFormError("יש להעלות אישור לצורך אימות.");
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
  });

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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">סטטוס מקצועי</label>
        <select
          {...register("roleStatus")}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        >
          {roleStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.roleStatus ? (
          <p className="mt-2 text-xs text-rose-600">{errors.roleStatus.message}</p>
        ) : null}
      </div>

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
        {isSubmitting ? "יוצר/ת חשבון..." : "יצירת חשבון"}
      </button>
    </form>
  );
}
