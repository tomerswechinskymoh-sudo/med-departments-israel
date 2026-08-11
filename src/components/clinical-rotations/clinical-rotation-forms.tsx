"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  clinicalRotationCoreSpecialtyLabels,
  clinicalRotationPaymentMethodLabels,
  clinicalRotationPaymentStatusLabels,
  clinicalRotationPriceUnitLabels
} from "@/lib/clinical-rotations-shared";

type SpecialtyOption = { id: string; name: string };
type DepartmentOption = { id: string; name: string; specialtyId?: string };
type HospitalOption = { id: string; name: string };

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = (await response.json().catch(() => null)) as { error?: string; warning?: string; inviteUrl?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "הפעולה נכשלה.");
  }

  return body;
}

async function postFormData(url: string, formData: FormData) {
  const response = await fetch(url, { method: "POST", body: formData });
  const body = (await response.json().catch(() => null)) as { error?: string; warning?: string; inviteUrl?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "הפעולה נכשלה.");
  }

  return body;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs font-black text-slate-600">{children}</span>;
}

function useJsonAction() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function run(action: () => Promise<{ warning?: string; inviteUrl?: string } | null | void>, success = "נשמר.") {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      setMessage(result?.warning ? `${success} ${result.warning}` : success);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "הפעולה נכשלה.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return { run, message, error, isSubmitting };
}

export function ClinicalRotationIdentityVerificationForm() {
  const action = useJsonAction();

  return (
    <form
      className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void action.run(() => postFormData("/api/clinical-rotations/identity", new FormData(event.currentTarget)), "בקשת האימות נשלחה לבדיקה.");
      }}
    >
      <h2 className="text-lg font-black text-ink">אימות זהות וזכאות</h2>
      <p className="text-sm leading-7 text-slate-700">תעודת הזהות מעובדת בצד השרת למזהה פנימי פסאודונימי. המסמך נמחק לאחר החלטת אימות.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label><FieldLabel>תעודת זהות ישראלית</FieldLabel><input name="israeliId" inputMode="numeric" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm" /></label>
        <label><FieldLabel>מסמך אימות PDF/JPG/PNG</FieldLabel><input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm" /></label>
      </div>
      {action.error ? <p className="text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="text-sm font-semibold text-emerald-700">{action.message}</p> : null}
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">שליחת אימות</button>
    </form>
  );
}

export function ClinicalRotationApplicationForm({
  offeringId,
  defaultStart,
  defaultEnd
}: {
  offeringId: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const action = useJsonAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(
          () =>
            postJson("/api/clinical-rotations/applications", {
              offeringId,
              requestedStartAt: formData.get("requestedStartAt"),
              requestedEndAt: formData.get("requestedEndAt"),
              acceptedRequirements: formData.get("acceptedRequirements") === "on",
              studentNotes: formData.get("studentNotes")
            }),
          "הבקשה הוגשה."
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <FieldLabel>תאריך התחלה</FieldLabel>
          <input name="requestedStartAt" type="date" defaultValue={defaultStart} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
        </label>
        <label>
          <FieldLabel>תאריך סיום</FieldLabel>
          <input name="requestedEndAt" type="date" defaultValue={defaultEnd} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
        </label>
      </div>
      <label>
        <FieldLabel>הערות לנספח הבקשה</FieldLabel>
        <textarea name="studentNotes" rows={4} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      </label>
      <label className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
        <input name="acceptedRequirements" type="checkbox" className="mt-1" />
        קראתי את הדרישות, מדיניות הביטול ותנאי התשלום של הסבב.
      </label>
      {action.error ? <p className="text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="text-sm font-semibold text-emerald-700">{action.message}</p> : null}
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
        {action.isSubmitting ? "שולח..." : "הגשת בקשה"}
      </button>
    </form>
  );
}

export function ClinicalRotationAvailabilityForm({
  hospitalId,
  windows
}: {
  hospitalId: string;
  windows: Array<{ id: string; label: string }>;
}) {
  const action = useJsonAction();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void action.run(() =>
            postJson("/api/clinical-rotations/hospital/availability", {
              action: "createWindow",
              hospitalId,
              startsAt: formData.get("startsAt"),
              endsAt: formData.get("endsAt"),
              notes: formData.get("notes")
            })
          );
        }}
      >
        <h2 className="text-lg font-black text-ink">חלון פתוח</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><FieldLabel>מתאריך</FieldLabel><input name="startsAt" type="date" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
          <label><FieldLabel>עד תאריך</FieldLabel><input name="endsAt" type="date" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        </div>
        <input name="notes" placeholder="הערות פנימיות" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
        <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירה</button>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void action.run(() =>
            postJson("/api/clinical-rotations/hospital/availability", {
              action: "createBlackout",
              hospitalId,
              availabilityWindowId: formData.get("availabilityWindowId"),
              startsAt: formData.get("startsAt"),
              endsAt: formData.get("endsAt"),
              reason: formData.get("reason")
            })
          );
        }}
      >
        <h2 className="text-lg font-black text-ink">תאריכי סגירה</h2>
        <select name="availabilityWindowId" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm">
          <option value="">ללא שיוך לחלון מסוים</option>
          {windows.map((window) => <option key={window.id} value={window.id}>{window.label}</option>)}
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><FieldLabel>מתאריך</FieldLabel><input name="startsAt" type="date" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
          <label><FieldLabel>עד תאריך</FieldLabel><input name="endsAt" type="date" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        </div>
        <input name="reason" placeholder="סיבה" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
        <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירה</button>
      </form>
      <div className="lg:col-span-2">
        {action.error ? <p className="text-sm font-semibold text-rose-700">{action.error}</p> : null}
        {action.message ? <p className="text-sm font-semibold text-emerald-700">{action.message}</p> : null}
      </div>
    </div>
  );
}

export function ClinicalRotationOfferingForm({
  hospitalId,
  specialties,
  departments,
  offering
}: {
  hospitalId: string;
  specialties: SpecialtyOption[];
  departments: DepartmentOption[];
  offering?: {
    id: string;
    specialtyId: string;
    departmentId: string | null;
    displayName: string;
    startsAt: string;
    endsAt: string;
    minimumParticipants: number;
    maximumCapacity: number | null;
    minDurationWeeks: number;
    maxDurationWeeks: number;
    priceAmount: string;
    priceUnit: "TOTAL" | "PER_WEEK";
    paymentMethod: "CASH_AT_ROTATION" | "EXTERNAL_PAYMENT_LINK";
    paymentLink: string | null;
    requirements: string | null;
    cancellationPolicy: string | null;
    workLanguage: string | null;
    departmentContactName: string | null;
    departmentContactEmail: string | null;
    requiresDeanApproval: boolean;
    requiresInsurance: boolean;
    groupRegistrationEnabled: boolean;
    groupMinSize: number | null;
    groupMaxSize: number | null;
    isPreviewOnly: boolean;
    applicationBlockedReason: string | null;
    studentInstructions: string | null;
    internalNotes: string | null;
  };
}) {
  const action = useJsonAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(() =>
          postJson("/api/clinical-rotations/hospital/offerings", {
            offeringId: offering?.id,
            hospitalId,
            specialtyId: formData.get("specialtyId"),
            departmentId: formData.get("departmentId"),
            displayName: formData.get("displayName"),
            startsAt: formData.get("startsAt"),
            endsAt: formData.get("endsAt"),
            minimumParticipants: formData.get("minimumParticipants"),
            maximumCapacity: formData.get("maximumCapacity"),
            minDurationWeeks: formData.get("minDurationWeeks"),
            maxDurationWeeks: formData.get("maxDurationWeeks"),
            priceAmount: formData.get("priceAmount"),
            priceUnit: formData.get("priceUnit"),
            paymentMethod: formData.get("paymentMethod"),
            paymentLink: formData.get("paymentLink"),
            requirements: formData.get("requirements"),
            cancellationPolicy: formData.get("cancellationPolicy"),
            workLanguage: formData.get("workLanguage"),
            departmentContactName: formData.get("departmentContactName"),
            departmentContactEmail: formData.get("departmentContactEmail"),
            requiresDeanApproval: formData.get("requiresDeanApproval") === "on",
            requiresInsurance: formData.get("requiresInsurance") === "on",
            groupRegistrationEnabled: formData.get("groupRegistrationEnabled") === "on",
            groupMinSize: formData.get("groupMinSize"),
            groupMaxSize: formData.get("groupMaxSize"),
            isPreviewOnly: formData.get("isPreviewOnly") === "on",
            applicationBlockedReason: formData.get("applicationBlockedReason"),
            studentInstructions: formData.get("studentInstructions"),
            internalNotes: formData.get("internalNotes"),
            publish: formData.get("publish") === "on"
          })
        );
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label><FieldLabel>תחום</FieldLabel><select name="specialtyId" defaultValue={offering?.specialtyId} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm">{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}</select></label>
        <label><FieldLabel>מחלקה קיימת</FieldLabel><select name="departmentId" defaultValue={offering?.departmentId ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm"><option value="">ללא מחלקה קיימת</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      </div>
      <label><FieldLabel>שם ציבורי</FieldLabel><input name="displayName" defaultValue={offering?.displayName} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label><FieldLabel>התחלה</FieldLabel><input name="startsAt" type="date" defaultValue={offering?.startsAt} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>סיום</FieldLabel><input name="endsAt" type="date" defaultValue={offering?.endsAt} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label><FieldLabel>מינימום משתתפים</FieldLabel><input name="minimumParticipants" type="number" min="1" defaultValue={offering?.minimumParticipants ?? 1} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>קיבולת מקסימלית</FieldLabel><input name="maximumCapacity" type="number" min="1" defaultValue={offering?.maximumCapacity ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>משך מינימלי בשבועות</FieldLabel><input name="minDurationWeeks" type="number" min="1" max="52" defaultValue={offering?.minDurationWeeks ?? 1} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>משך מקסימלי בשבועות</FieldLabel><input name="maxDurationWeeks" type="number" min="1" max="52" defaultValue={offering?.maxDurationWeeks ?? 12} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label><FieldLabel>מחיר</FieldLabel><input name="priceAmount" type="number" min="0" step="1" defaultValue={offering?.priceAmount ?? "0"} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>יחידת מחיר</FieldLabel><select name="priceUnit" defaultValue={offering?.priceUnit ?? "PER_WEEK"} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm"><option value="PER_WEEK">{clinicalRotationPriceUnitLabels.PER_WEEK}</option><option value="TOTAL">{clinicalRotationPriceUnitLabels.TOTAL}</option></select></label>
        <label><FieldLabel>שפת עבודה</FieldLabel><input name="workLanguage" defaultValue={offering?.workLanguage ?? "עברית"} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><FieldLabel>שיטת תשלום</FieldLabel><select name="paymentMethod" defaultValue={offering?.paymentMethod ?? "CASH_AT_ROTATION"} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm"><option value="CASH_AT_ROTATION">{clinicalRotationPaymentMethodLabels.CASH_AT_ROTATION}</option><option value="EXTERNAL_PAYMENT_LINK">{clinicalRotationPaymentMethodLabels.EXTERNAL_PAYMENT_LINK}</option></select></label>
        <label><FieldLabel>קישור HTTPS לתשלום</FieldLabel><input name="paymentLink" defaultValue={offering?.paymentLink ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label><FieldLabel>איש קשר במחלקה</FieldLabel><input name="departmentContactName" defaultValue={offering?.departmentContactName ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>אימייל איש קשר</FieldLabel><input name="departmentContactEmail" type="email" defaultValue={offering?.departmentContactEmail ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <label><FieldLabel>דרישות חובה לסטודנטים</FieldLabel><textarea name="requirements" rows={3} defaultValue={offering?.requirements ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      <label><FieldLabel>מדיניות ביטול</FieldLabel><textarea name="cancellationPolicy" rows={3} defaultValue={offering?.cancellationPolicy ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      <label><FieldLabel>הנחיות לסטודנטים</FieldLabel><textarea name="studentInstructions" rows={3} defaultValue={offering?.studentInstructions ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      <label><FieldLabel>הערות פנימיות</FieldLabel><textarea name="internalNotes" rows={3} defaultValue={offering?.internalNotes ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="requiresDeanApproval" type="checkbox" defaultChecked={offering?.requiresDeanApproval ?? false} /> דורש אישור דיקן</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="requiresInsurance" type="checkbox" defaultChecked={offering?.requiresInsurance ?? true} /> דורש ביטוח</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="groupRegistrationEnabled" type="checkbox" defaultChecked={offering?.groupRegistrationEnabled ?? false} /> הרשמה קבוצתית</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isPreviewOnly" type="checkbox" defaultChecked={offering?.isPreviewOnly ?? false} /> תצוגה בלבד</label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label><FieldLabel>מינימום קבוצה</FieldLabel><input name="groupMinSize" type="number" min="2" defaultValue={offering?.groupMinSize ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>מקסימום קבוצה</FieldLabel><input name="groupMaxSize" type="number" min="2" defaultValue={offering?.groupMaxSize ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>סיבת חסימת הגשות</FieldLabel><input name="applicationBlockedReason" defaultValue={offering?.applicationBlockedReason ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <input name="publish" type="checkbox" />
        פרסום לאחר שמירה
      </label>
      {action.error ? <p className="text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="text-sm font-semibold text-emerald-700">{action.message}</p> : null}
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">שמירה</button>
    </form>
  );
}

export function ClinicalRotationActionForm({
  endpoint,
  payload,
  label,
  tone = "primary"
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  tone?: "primary" | "danger" | "neutral";
}) {
  const action = useJsonAction();
  const className =
    tone === "danger"
      ? "rounded-full bg-rose-700 px-4 py-2 text-xs font-black text-white"
      : tone === "neutral"
        ? "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
        : "rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white";

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={action.isSubmitting} onClick={() => void action.run(() => postJson(endpoint, payload))} className={className}>
        {action.isSubmitting ? "..." : label}
      </button>
      {action.error ? <span className="max-w-48 text-xs text-rose-700">{action.error}</span> : null}
    </span>
  );
}

export function ClinicalRotationGroupApplicationForm({
  offeringId,
  defaultStart,
  defaultEnd,
  defaultMaxMembers
}: {
  offeringId: string;
  defaultStart: string;
  defaultEnd: string;
  defaultMaxMembers: number;
}) {
  const action = useJsonAction();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(async () => {
          const result = await postJson("/api/clinical-rotations/groups", {
            action: "create",
            offeringId,
            requestedStartAt: formData.get("requestedStartAt"),
            requestedEndAt: formData.get("requestedEndAt"),
            maxMembers: formData.get("maxMembers"),
            acceptedRequirements: formData.get("acceptedRequirements") === "on",
            studentNotes: formData.get("studentNotes")
          });
          if (result?.inviteUrl) setInviteUrl(result.inviteUrl);
          return result;
        }, "הקבוצה נוצרה.");
      }}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <label><FieldLabel>תאריך התחלה</FieldLabel><input name="requestedStartAt" type="date" defaultValue={defaultStart} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>תאריך סיום</FieldLabel><input name="requestedEndAt" type="date" defaultValue={defaultEnd} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
        <label><FieldLabel>מקסימום חברים</FieldLabel><input name="maxMembers" type="number" min="2" defaultValue={defaultMaxMembers} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" /></label>
      </div>
      <textarea name="studentNotes" rows={3} placeholder="הערות לקבוצה" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <label className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
        <input name="acceptedRequirements" type="checkbox" className="mt-1" />
        אני מאשר/ת שכל משתתף יצטרף עצמאית ויעבור בדיקות זכאות.
      </label>
      {inviteUrl ? <p className="break-all rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{inviteUrl}</p> : null}
      {action.error ? <p className="text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="text-sm font-semibold text-emerald-700">{action.message}</p> : null}
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">יצירת קבוצה</button>
    </form>
  );
}

export function ClinicalRotationGroupJoinForm({ inviteToken }: { inviteToken: string }) {
  const action = useJsonAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(() =>
          postJson("/api/clinical-rotations/groups", {
            action: "join",
            inviteToken,
            acceptedRequirements: formData.get("acceptedRequirements") === "on",
            studentNotes: formData.get("studentNotes")
          }), "הצטרפת לקבוצה."
        );
      }}
    >
      <textarea name="studentNotes" rows={3} placeholder="הערות אישיות לבקשת ההצטרפות" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <label className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
        <input name="acceptedRequirements" type="checkbox" className="mt-1" />
        קראתי את דרישות הסבב ואני מבקש/ת להצטרף לקבוצה.
      </label>
      {action.error ? <p className="text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="text-sm font-semibold text-emerald-700">{action.message}</p> : null}
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">הצטרפות</button>
    </form>
  );
}

export function ClinicalRotationCancellationForm({ applicationId }: { applicationId: string }) {
  const action = useJsonAction();

  return (
    <form
      className="mt-3 grid gap-2 md:grid-cols-[160px_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(() =>
          postJson("/api/clinical-rotations/cancellations", {
            applicationId,
            reasonCategory: formData.get("reasonCategory"),
            note: formData.get("note")
          }), "בקשת הביטול נשלחה."
        );
      }}
    >
      <select name="reasonCategory" className="rounded-2xl border border-brand-100 px-3 py-2 text-xs">
        <option value="SCHEDULE_CONFLICT">התנגשות תאריכים</option>
        <option value="PERSONAL">סיבה אישית</option>
        <option value="PAYMENT">תשלום</option>
        <option value="OTHER">אחר</option>
      </select>
      <input name="note" placeholder="פירוט קצר" className="rounded-2xl border border-brand-100 px-3 py-2 text-xs" />
      <button disabled={action.isSubmitting} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-700">בקשת ביטול</button>
      {action.error ? <p className="md:col-span-3 text-xs text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="md:col-span-3 text-xs text-emerald-700">{action.message}</p> : null}
    </form>
  );
}

export function ClinicalRotationEligibilityImportForm() {
  const action = useJsonAction();

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        void action.run(() => postFormData("/api/admin/clinical-rotations/eligibility-imports", new FormData(event.currentTarget)), "רשימת הזכאות עובדה.");
      }}
    >
      <input name="sourceLabel" placeholder="תווית מקור" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <input name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="activate" type="checkbox" defaultChecked /> להפוך לפעילה</label>
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">ייבוא</button>
      {action.error ? <p className="md:col-span-4 text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="md:col-span-4 text-sm font-semibold text-emerald-700">{action.message}</p> : null}
    </form>
  );
}

export function ClinicalRotationAdminAccessForm({
  hospitals
}: {
  hospitals: HospitalOption[];
}) {
  const action = useJsonAction();

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(() =>
          postJson("/api/admin/clinical-rotations/users", {
            action: "inviteOrUpdate",
            fullName: formData.get("fullName"),
            email: formData.get("email"),
            hospitalId: formData.get("hospitalId"),
            isActive: formData.get("isActive") === "on"
          })
        );
      }}
    >
      <input name="fullName" placeholder="שם נציג/ה" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <input name="email" type="email" placeholder="email@example.com" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <select name="hospitalId" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm">
        {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> פעיל</label>
      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
        <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">הזמנה/שמירה</button>
        {action.error ? <span className="text-sm font-semibold text-rose-700">{action.error}</span> : null}
        {action.message ? <span className="text-sm font-semibold text-emerald-700">{action.message}</span> : null}
      </div>
    </form>
  );
}

export function ClinicalRotationAdminPermissionForm() {
  const action = useJsonAction();

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(() =>
          postJson("/api/admin/clinical-rotations/permissions", {
            email: formData.get("email"),
            isActive: formData.get("isActive") === "on"
          })
        );
      }}
    >
      <input name="email" type="email" placeholder="admin@example.com" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> הרשאת מסמכי אימות</label>
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירה</button>
      {action.error ? <p className="md:col-span-3 text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="md:col-span-3 text-sm font-semibold text-emerald-700">{action.message}</p> : null}
    </form>
  );
}

export function ClinicalRotationCoreRuleForm({
  specialties
}: {
  specialties: SpecialtyOption[];
}) {
  const action = useJsonAction();

  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_1fr_120px_150px_120px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void action.run(() =>
          postJson("/api/admin/clinical-rotations/core-rules", {
            coreSpecialty: formData.get("coreSpecialty"),
            specialtyId: formData.get("specialtyId"),
            maxWeeks: formData.get("maxWeeks"),
            effectiveDate: formData.get("effectiveDate"),
            enforcementMode: formData.get("enforcementMode"),
            isActive: formData.get("isActive") === "on",
            notes: formData.get("notes")
          })
        );
      }}
    >
      <select name="coreSpecialty" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm">
        {Object.entries(clinicalRotationCoreSpecialtyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select name="specialtyId" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm">
        <option value="">ללא שיוך תחום קיים</option>
        {specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
      </select>
      <input name="maxWeeks" type="number" min="1" max="52" placeholder="שבועות" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <input name="effectiveDate" type="date" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <select name="enforcementMode" defaultValue="WARN" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm"><option value="WARN">WARN</option><option value="BLOCK">BLOCK</option></select>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> פעיל</label>
      <input name="notes" placeholder="הערות" className="md:col-span-5 rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
      <button disabled={action.isSubmitting} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירה</button>
      {action.error ? <p className="md:col-span-6 text-sm font-semibold text-rose-700">{action.error}</p> : null}
      {action.message ? <p className="md:col-span-6 text-sm font-semibold text-emerald-700">{action.message}</p> : null}
    </form>
  );
}

export function paymentStatusLabel(status: string) {
  return clinicalRotationPaymentStatusLabels[status as keyof typeof clinicalRotationPaymentStatusLabels] ?? status;
}
