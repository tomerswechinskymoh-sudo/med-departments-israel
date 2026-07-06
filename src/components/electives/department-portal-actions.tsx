"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

type AvailabilityMode = "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT";
type WindowStatus = "OPEN" | "CLOSED";
type TrackType = "ISRAELI_FACULTY_STUDENT" | "ABROAD_ISRAELI_STUDENT";

const ELECTIVE_TRACK_OPTIONS: Array<{ value: TrackType; label: string }> = [
  { value: "ISRAELI_FACULTY_STUDENT", label: "סטודנטים לרפואה בישראל" },
  { value: "ABROAD_ISRAELI_STUDENT", label: "ישראלים הלומדים בחו״ל" }
];

type SettingsInitial = {
  maxStudentsAtOnce: number;
  availabilityMode: AvailabilityMode;
  minDurationDays?: number | null;
  maxDurationDays?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
  notes?: string | null;
  allowApplications: boolean;
} | null;

type TrackSettingsInitial = Array<{
  trackType: TrackType;
  allowApplications: boolean;
  maxStudentsAtOnce: number;
  minDurationDays?: number | null;
  maxDurationDays?: number | null;
  notes?: string | null;
  paymentRequired: boolean;
  paymentAmount?: string | null;
  paymentCurrency?: string | null;
  paymentLink?: string | null;
  paymentInstructions?: string | null;
}>;

type WindowItem = {
  id: string;
  trackType?: TrackType | null;
  status: WindowStatus;
  startsAt: string;
  endsAt: string;
  capacityOverride?: number | null;
  reason?: string | null;
  note?: string | null;
};

async function postJson(path: string, values: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string; redirectTo?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "הפעולה נכשלה.");
  }

  return payload ?? {};
}

function StatusMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{message}</p>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-black text-slate-600">{children}</label>;
}

export function ElectiveDepartmentLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const payload = await postJson("/api/electives/department/login", {
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? "")
      });
      router.replace(payload.redirectTo ?? "/electives/department");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "התחברות נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <FieldLabel>שם משתמש</FieldLabel>
        <input
          name="username"
          autoComplete="username"
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          required
        />
      </div>
      <div className="space-y-1">
        <FieldLabel>סיסמה</FieldLabel>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          required
        />
      </div>
      <StatusMessage message={message} />
      <button
        type="submit"
        disabled={isWorking}
        className="w-full rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        כניסה לניהול אלקטיבים
      </button>
    </form>
  );
}

export function ElectiveDepartmentLogoutButton() {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);

  async function logout() {
    setIsWorking(true);

    try {
      const payload = await postJson("/api/electives/department/logout", {});
      router.replace(payload.redirectTo ?? "/electives/department-login");
      router.refresh();
    } catch {
      router.replace("/electives/department-login");
      router.refresh();
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isWorking}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-60"
    >
      יציאה
    </button>
  );
}

export function ElectiveDepartmentSettingsPortalForm({
  initialSettings,
  initialTrackSettings = [],
  departmentId
}: {
  initialSettings: SettingsInitial;
  initialTrackSettings?: TrackSettingsInitial;
  departmentId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>(
    initialSettings?.availabilityMode ?? "CLOSED_BY_DEFAULT"
  );
  const [allowApplications, setAllowApplications] = useState(initialSettings?.allowApplications ?? false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const trackSettings = ELECTIVE_TRACK_OPTIONS.map((track) => ({
        trackType: track.value,
        allowApplications: form.get(`${track.value}.allowApplications`) === "on",
        maxStudentsAtOnce: Number(form.get(`${track.value}.maxStudentsAtOnce`) ?? 1),
        minDurationDays: String(form.get(`${track.value}.minDurationDays`) ?? ""),
        maxDurationDays: String(form.get(`${track.value}.maxDurationDays`) ?? ""),
        notes: String(form.get(`${track.value}.notes`) ?? ""),
        paymentRequired: form.get(`${track.value}.paymentRequired`) === "on",
        paymentAmount: String(form.get(`${track.value}.paymentAmount`) ?? ""),
        paymentCurrency: String(form.get(`${track.value}.paymentCurrency`) ?? "ILS"),
        paymentLink: String(form.get(`${track.value}.paymentLink`) ?? ""),
        paymentInstructions: String(form.get(`${track.value}.paymentInstructions`) ?? "")
      }));
      const payload = await postJson("/api/electives/department/settings", {
        departmentId,
        maxStudentsAtOnce: Number(form.get("maxStudentsAtOnce") ?? 1),
        availabilityMode,
        minDurationDays: String(form.get("minDurationDays") ?? ""),
        maxDurationDays: String(form.get("maxDurationDays") ?? ""),
        allowApplications,
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        instructions: String(form.get("instructions") ?? ""),
        notes: String(form.get("notes") ?? ""),
        trackSettings
      });
      setMessage(payload.message ?? "נשמר.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>מקסימום סטודנטים במקביל</FieldLabel>
          <input
            name="maxStudentsAtOnce"
            type="number"
            min={1}
            max={50}
            defaultValue={initialSettings?.maxStudentsAtOnce ?? 1}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>מצב זמינות בסיסי</FieldLabel>
          <select
            value={availabilityMode}
            onChange={(event) => setAvailabilityMode(event.target.value as AvailabilityMode)}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="OPEN_BY_DEFAULT">פתוח כברירת מחדל</option>
            <option value="CLOSED_BY_DEFAULT">סגור כברירת מחדל</option>
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>משך מינימלי בימים</FieldLabel>
          <input
            name="minDurationDays"
            type="number"
            min={1}
            max={365}
            defaultValue={initialSettings?.minDurationDays ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>משך מקסימלי בימים</FieldLabel>
          <input
            name="maxDurationDays"
            type="number"
            min={1}
            max={365}
            defaultValue={initialSettings?.maxDurationDays ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>אימייל קשר</FieldLabel>
          <input
            name="contactEmail"
            type="email"
            defaultValue={initialSettings?.contactEmail ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>טלפון קשר</FieldLabel>
          <input
            name="contactPhone"
            defaultValue={initialSettings?.contactPhone ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={allowApplications} onChange={(event) => setAllowApplications(event.target.checked)} />
        לאפשר מועמדויות עתידיות כשהמסלול הציבורי ייפתח
      </label>
      <textarea
        name="instructions"
        defaultValue={initialSettings?.instructions ?? ""}
        placeholder="הנחיות למחזורי אלקטיב עתידיים"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <textarea
        name="notes"
        defaultValue={initialSettings?.notes ?? ""}
        placeholder="הערות למחלקה"
        className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <div className="space-y-3">
        <h3 className="text-sm font-black text-ink">הגדרות לפי סוג סבב</h3>
        {ELECTIVE_TRACK_OPTIONS.map((track) => {
          const initial = initialTrackSettings.find((settings) => settings.trackType === track.value);

          return (
            <section key={track.value} className="space-y-3 rounded-3xl border border-brand-100 bg-brand-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-black text-ink">{track.label}</h4>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input name={`${track.value}.allowApplications`} type="checkbox" defaultChecked={initial?.allowApplications ?? initialSettings?.allowApplications ?? false} />
                  פתוח להגשה
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <FieldLabel>מספר סטודנטים שיכולים להיות בו זמנית</FieldLabel>
                  <input name={`${track.value}.maxStudentsAtOnce`} type="number" min={1} max={200} defaultValue={initial?.maxStudentsAtOnce ?? initialSettings?.maxStudentsAtOnce ?? 1} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>משך מינימלי בימים</FieldLabel>
                  <input name={`${track.value}.minDurationDays`} type="number" min={1} max={365} defaultValue={initial?.minDurationDays ?? initialSettings?.minDurationDays ?? ""} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>משך מקסימלי בימים</FieldLabel>
                  <input name={`${track.value}.maxDurationDays`} type="number" min={1} max={365} defaultValue={initial?.maxDurationDays ?? initialSettings?.maxDurationDays ?? ""} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input name={`${track.value}.paymentRequired`} type="checkbox" defaultChecked={initial?.paymentRequired ?? false} />
                נדרש תשלום
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <input name={`${track.value}.paymentAmount`} placeholder="סכום תשלום" defaultValue={initial?.paymentAmount ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
                <input name={`${track.value}.paymentCurrency`} placeholder="מטבע" defaultValue={initial?.paymentCurrency ?? "ILS"} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
                <input name={`${track.value}.paymentLink`} placeholder="קישור לתשלום" defaultValue={initial?.paymentLink ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
              </div>
              <textarea name={`${track.value}.notes`} defaultValue={initial?.notes ?? ""} placeholder="הערות לסוג הסבב" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
              <textarea name={`${track.value}.paymentInstructions`} defaultValue={initial?.paymentInstructions ?? ""} placeholder="הנחיות תשלום" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
            </section>
          );
        })}
      </div>
      <StatusMessage message={message} />
      <button
        type="submit"
        disabled={isWorking}
        className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        שמירת הגדרות
      </button>
    </form>
  );
}

function WindowForm({
  window,
  actionLabel,
  departmentId
}: {
  window?: WindowItem;
  actionLabel: string;
  departmentId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState<WindowStatus>(window?.status ?? "OPEN");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const payload = await postJson("/api/electives/department/availability", {
        departmentId,
        action: window ? "update" : "create",
        id: window?.id,
        trackType: String(form.get("trackType") ?? ""),
        status,
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
        capacityOverride: String(form.get("capacityOverride") ?? ""),
        reason: String(form.get("reason") ?? ""),
        note: String(form.get("note") ?? "")
      });
      setMessage(payload.message ?? "נשמר.");
      if (!window) {
        event.currentTarget.reset();
        setStatus("OPEN");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  async function onDelete() {
    if (!window) {
      return;
    }

    setIsWorking(true);
    setMessage(null);

    try {
      const payload = await postJson("/api/electives/department/availability", {
        departmentId,
        action: "delete",
        id: window.id
      });
      setMessage(payload.message ?? "נמחק.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "מחיקה נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="space-y-1">
          <FieldLabel>סוג סבב</FieldLabel>
          <select name="trackType" defaultValue={window?.trackType ?? ""} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">כל סוגי הסבבים</option>
            {ELECTIVE_TRACK_OPTIONS.map((track) => (
              <option key={track.value} value={track.value}>{track.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>סטטוס</FieldLabel>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as WindowStatus)}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="OPEN">פתוח</option>
            <option value="CLOSED">סגור</option>
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>מתאריך</FieldLabel>
          <input
            name="startsAt"
            type="date"
            defaultValue={window?.startsAt ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>עד תאריך</FieldLabel>
          <input
            name="endsAt"
            type="date"
            defaultValue={window?.endsAt ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>קיבולת חריגה</FieldLabel>
          <input
            name="capacityOverride"
            type="number"
            min={1}
            max={50}
            defaultValue={window?.capacityOverride ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>סיבה</FieldLabel>
          <input
            name="reason"
            defaultValue={window?.reason ?? ""}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>
      <input
        name="note"
        defaultValue={window?.note ?? ""}
        placeholder="הערה פנימית למחלקה"
        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isWorking}
          className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {actionLabel}
        </button>
        {window ? (
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={isWorking}
            className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 disabled:opacity-60"
          >
            מחיקה
          </button>
        ) : null}
      </div>
      <StatusMessage message={message} />
    </form>
  );
}

export function ElectiveDepartmentAvailabilityManager({ windows, departmentId }: { windows: WindowItem[]; departmentId: string }) {
  return (
    <div className="space-y-5">
      <WindowForm actionLabel="הוספת חלון זמינות" departmentId={departmentId} />
      <div className="space-y-3">
        {windows.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-brand-100 bg-white px-4 py-5 text-sm text-slate-600">
            אין חלונות זמינות למחלקה כרגע.
          </p>
        ) : (
          windows.map((window) => <WindowForm key={window.id} window={window} actionLabel="עדכון חלון" departmentId={departmentId} />)
        )}
      </div>
    </div>
  );
}
