"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

type DepartmentOption = {
  id: string;
  label: string;
};

const ELECTIVE_TRACK_OPTIONS = [
  { value: "ISRAELI_FACULTY_STUDENT", label: "סטודנטים לרפואה בישראל" },
  { value: "ABROAD_ISRAELI_STUDENT", label: "ישראלים הלומדים בחו״ל" }
] as const;

type ElectiveAccountInitial = {
  username: string;
  isActive: boolean;
} | null;

type ElectiveSettingsInitial = {
  maxStudentsAtOnce: number;
  availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT";
  minDurationDays?: number | null;
  maxDurationDays?: number | null;
  allowApplications?: boolean | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
} | null;

async function postJson(path: string, values: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "שמירה נכשלה.");
  }

  return payload?.message ?? "נשמר.";
}

async function putJson(path: string, values: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "עדכון נכשל.");
  }

  return payload?.message ?? "עודכן.";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-black text-slate-600">{children}</label>;
}

function StatusMessage({ message }: { message: string | null }) {
  return message ? <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{message}</p> : null;
}

export function ElectiveDepartmentAccountForm({
  departments,
  initialDepartmentId = "",
  initialAccount = null
}: {
  departments: DepartmentOption[];
  initialDepartmentId?: string;
  initialAccount?: ElectiveAccountInitial;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [username, setUsername] = useState(initialAccount?.username ?? "");
  const [isActive, setIsActive] = useState(initialAccount?.isActive ?? true);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/electives/department-accounts", {
        departmentId,
        username,
        password: String(form.get("password") ?? ""),
        isActive
      });
      setMessage(saved);
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>מחלקה</FieldLabel>
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
          >
            <option value="">בחירת מחלקה</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>שם משתמש למחלקה</FieldLabel>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
            minLength={3}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-1">
          <FieldLabel>סיסמה זמנית</FieldLabel>
          <input
            name="password"
            type="password"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
            minLength={8}
          />
        </div>
        <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          פעיל
        </label>
      </div>
      <StatusMessage message={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירת חשבון מחלקה</button>
    </form>
  );
}

export function ElectiveRepresentativeAccountForm({
  departments
}: {
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [receivesApplicationEmails, setReceivesApplicationEmails] = useState(true);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const departmentIds = form.getAll("departmentIds").map(String).filter(Boolean);

    try {
      const saved = await postJson("/api/admin/electives/representatives", {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        phone: String(form.get("phone") ?? ""),
        departmentIds,
        role: String(form.get("role") ?? "PRIMARY"),
        isActive,
        receivesApplicationEmails
      });
      setMessage(saved);
      event.currentTarget.reset();
      setIsActive(true);
      setReceivesApplicationEmails(true);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>שם נציג/ה</FieldLabel>
          <input name="name" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
        </div>
        <div className="space-y-1">
          <FieldLabel>אימייל</FieldLabel>
          <input name="email" type="email" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
        </div>
        <div className="space-y-1">
          <FieldLabel>שם משתמש</FieldLabel>
          <input name="username" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required minLength={3} />
        </div>
        <div className="space-y-1">
          <FieldLabel>סיסמה זמנית</FieldLabel>
          <input name="password" type="password" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required minLength={8} />
        </div>
        <div className="space-y-1">
          <FieldLabel>טלפון</FieldLabel>
          <input name="phone" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        </div>
        <div className="space-y-1">
          <FieldLabel>תפקיד בהרשאות</FieldLabel>
          <select name="role" defaultValue="PRIMARY" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="PRIMARY">PRIMARY</option>
            <option value="SECONDARY">SECONDARY</option>
            <option value="VIEW_ONLY">VIEW_ONLY</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <FieldLabel>מחלקות לניהול</FieldLabel>
        <select name="departmentIds" multiple required className="min-h-40 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">אפשר לבחור יותר ממחלקה אחת.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          פעיל
        </label>
        <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={receivesApplicationEmails}
            onChange={(event) => setReceivesApplicationEmails(event.target.checked)}
          />
          מקבל/ת אימיילים על בקשות
        </label>
      </div>
      <StatusMessage message={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירת נציג/ה</button>
    </form>
  );
}

type HospitalRepresentativeGenerationRow = {
  hospitalName: string;
  username: string;
  departmentCount: number;
  status: string;
  temporaryPassword: string | null;
};

export function ElectiveHospitalRepresentativeGenerationForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<HospitalRepresentativeGenerationRow[]>([]);
  const [resetExistingPasswords, setResetExistingPasswords] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  async function onGenerate() {
    setIsWorking(true);
    setMessage(null);
    setRows([]);

    try {
      const response = await fetch("/api/admin/electives/representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateByHospital", resetExistingPasswords })
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        summary?: { warning?: string | null; results?: HospitalRepresentativeGenerationRow[] };
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "יצירת הנציגים נכשלה.");
      }

      setMessage([payload?.message, payload?.summary?.warning].filter(Boolean).join(" "));
      setRows(payload?.summary?.results ?? []);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "יצירת הנציגים נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div>
        <p className="text-sm font-black text-ink">יצירת משתמשי נציגים לפי בתי חולים</p>
        <p className="mt-1 text-xs leading-6 text-slate-600">
          יוצר חשבון אחד לכל בית חולים עם מחלקות אלקטיב ומשייך אליו את כל המחלקות הרלוונטיות. סיסמה זמנית מוצגת רק לחשבונות חדשים או לאחר איפוס.
        </p>
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={resetExistingPasswords} onChange={(event) => setResetExistingPasswords(event.target.checked)} />
        לאפס סיסמאות קיימות ולהציג סיסמאות זמניות
      </label>
      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={isWorking}
        className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        יצירת משתמשי נציגים לפי בתי חולים
      </button>
      <StatusMessage message={message} />
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="min-w-full text-right text-xs">
            <thead className="font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">בית חולים</th>
                <th className="px-3 py-2">שם משתמש</th>
                <th className="px-3 py-2">מחלקות</th>
                <th className="px-3 py-2">סטטוס</th>
                <th className="px-3 py-2">סיסמה זמנית</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.username} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.hospitalName}</td>
                  <td className="px-3 py-2" dir="ltr">{row.username}</td>
                  <td className="px-3 py-2">{row.departmentCount}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2" dir="ltr">{row.temporaryPassword ?? "לא אופסה"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <a href="/electives/department-login" className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">
        מעבר לכניסת נציגים
      </a>
    </div>
  );
}

export function ElectiveRepresentativeResetPasswordButton({ username }: { username: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function onReset() {
    setIsWorking(true);
    setMessage(null);
    setTemporaryPassword(null);

    try {
      const response = await fetch("/api/admin/electives/representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetHospitalRepresentativePassword", username })
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        result?: { temporaryPassword?: string; warning?: string | null };
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "איפוס הסיסמה נכשל.");
      }

      setMessage([payload?.message, payload?.result?.warning].filter(Boolean).join(" "));
      setTemporaryPassword(payload?.result?.temporaryPassword ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "איפוס הסיסמה נכשל.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onReset()}
        disabled={isWorking}
        className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-60"
      >
        איפוס סיסמה לנציג
      </button>
      {message ? <p className="text-xs font-semibold text-slate-600">{message}</p> : null}
      {temporaryPassword ? <code className="block select-all rounded-xl bg-amber-50 px-3 py-2 text-left text-xs font-black text-slate-900" dir="ltr">{temporaryPassword}</code> : null}
    </div>
  );
}

export function ElectiveDepartmentSettingsForm({
  departments,
  initialDepartmentId = "",
  initialSettings = null
}: {
  departments: DepartmentOption[];
  initialDepartmentId?: string;
  initialSettings?: ElectiveSettingsInitial;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [availabilityMode, setAvailabilityMode] = useState<"OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT">(
    initialSettings?.availabilityMode ?? "CLOSED_BY_DEFAULT"
  );
  const [allowApplications, setAllowApplications] = useState(initialSettings?.allowApplications ?? false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/electives/settings", {
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
        adminNotes: String(form.get("adminNotes") ?? "")
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-3">
          <FieldLabel>מחלקה</FieldLabel>
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
          >
            <option value="">בחירת מחלקה</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </select>
        </div>
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
            onChange={(event) => setAvailabilityMode(event.target.value as "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="OPEN_BY_DEFAULT">פתוח כברירת מחדל</option>
            <option value="CLOSED_BY_DEFAULT">סגור כברירת מחדל</option>
          </select>
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
      </div>
      <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={allowApplications} onChange={(event) => setAllowApplications(event.target.checked)} />
        לאפשר מועמדויות עתידיות
      </label>
      <textarea
        name="instructions"
        defaultValue={initialSettings?.instructions ?? ""}
        placeholder="הנחיות למחלקה / לסטודנטים בעתיד"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <textarea
        name="notes"
        defaultValue={initialSettings?.notes ?? ""}
        placeholder="הערות מחלקה"
        className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <textarea
        name="adminNotes"
        defaultValue={initialSettings?.adminNotes ?? ""}
        placeholder="הערות אדמין פנימיות"
        className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <StatusMessage message={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירת הגדרות אלקטיב</button>
    </form>
  );
}

export function ElectiveAvailabilityWindowForm({
  departments,
  initialDepartmentId = ""
}: {
  departments: DepartmentOption[];
  initialDepartmentId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/electives/windows", {
        departmentId,
        status,
        trackType: String(form.get("trackType") ?? ""),
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
        capacityOverride: String(form.get("capacityOverride") ?? ""),
        reason: String(form.get("reason") ?? ""),
        note: String(form.get("note") ?? "")
      });
      setMessage(saved);
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-4">
          <FieldLabel>מחלקה</FieldLabel>
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
            required
          >
            <option value="">בחירת מחלקה</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>סטטוס חלון</FieldLabel>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "OPEN" | "CLOSED")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="OPEN">פתוח</option>
            <option value="CLOSED">סגור</option>
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>סוג סבב</FieldLabel>
          <select name="trackType" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">כל סוגי הסבבים</option>
            {ELECTIVE_TRACK_OPTIONS.map((track) => (
              <option key={track.value} value={track.value}>{track.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>מתאריך</FieldLabel>
          <input name="startsAt" type="date" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
        </div>
        <div className="space-y-1">
          <FieldLabel>עד תאריך</FieldLabel>
          <input name="endsAt" type="date" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
        </div>
        <div className="space-y-1">
          <FieldLabel>הערה</FieldLabel>
          <input name="note" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        </div>
        <div className="space-y-1">
          <FieldLabel>סיבה</FieldLabel>
          <input name="reason" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        </div>
        <div className="space-y-1">
          <FieldLabel>קיבולת חריגה</FieldLabel>
          <input
            name="capacityOverride"
            type="number"
            min={1}
            max={50}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>
      <StatusMessage message={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">הוספת חלון זמינות</button>
    </form>
  );
}

export function ElectiveApplicationAdminForm({ departments }: { departments: DepartmentOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("SUBMITTED");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/electives/applications", {
        departmentId,
        applicantName: String(form.get("applicantName") ?? ""),
        applicantEmail: String(form.get("applicantEmail") ?? ""),
        applicantPhone: String(form.get("applicantPhone") ?? ""),
        medicalSchool: String(form.get("medicalSchool") ?? ""),
        requestedStartDate: String(form.get("requestedStartDate") ?? ""),
        requestedEndDate: String(form.get("requestedEndDate") ?? ""),
        trackType: String(form.get("trackType") ?? "ISRAELI_FACULTY_STUDENT"),
        status,
        studentNotes: String(form.get("studentNotes") ?? ""),
        adminNotes: String(form.get("adminNotes") ?? "")
      });
      setMessage(saved);
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none md:col-span-3"
          required
        >
          <option value="">מחלקה</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.label}
            </option>
          ))}
        </select>
        <input name="applicantName" placeholder="שם סטודנט/ית" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
        <input name="applicantEmail" type="email" placeholder="אימייל" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
        <input name="applicantPhone" placeholder="טלפון" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <input name="medicalSchool" placeholder="פקולטה" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <input name="requestedStartDate" type="date" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <input name="requestedEndDate" type="date" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <select name="trackType" defaultValue="ISRAELI_FACULTY_STUDENT" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
          {ELECTIVE_TRACK_OPTIONS.map((track) => (
            <option key={track.value} value={track.value}>{track.label}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
          <option value="SUBMITTED">הוגש</option>
          <option value="UNDER_REVIEW">בבדיקה</option>
          <option value="ACCEPTED">אושר</option>
          <option value="APPROVED">אושר</option>
          <option value="WAITLISTED">רשימת המתנה</option>
          <option value="REJECTED">נדחה</option>
          <option value="ALTERNATIVE_OFFERED">הוצעה חלופה</option>
          <option value="ALTERNATIVE_ACCEPTED">חלופה אושרה</option>
          <option value="ALTERNATIVE_DECLINED">חלופה נדחתה</option>
          <option value="CANCELLED">בוטל</option>
          <option value="ARCHIVED">ארכיון</option>
        </select>
      </div>
      <textarea name="studentNotes" placeholder="הערות סטודנט/ית" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
      <textarea name="adminNotes" placeholder="הערות אדמין" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
      <StatusMessage message={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">הוספת מועמדות אדמין</button>
    </form>
  );
}

export function ElectiveApplicationStatusForm({
  applicationId,
  initialStatus
}: {
  applicationId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);

    try {
      const saved = await putJson("/api/admin/electives/applications", {
        applicationId,
        status
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "עדכון נכשל.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-full border border-brand-100 bg-white px-3 py-2 text-xs font-semibold outline-none"
        >
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="WAITLISTED">WAITLISTED</option>
          <option value="ALTERNATIVE_OFFERED">ALTERNATIVE_OFFERED</option>
          <option value="ALTERNATIVE_ACCEPTED">ALTERNATIVE_ACCEPTED</option>
          <option value="ALTERNATIVE_DECLINED">ALTERNATIVE_DECLINED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <button
          type="submit"
          disabled={isWorking}
          className="rounded-full bg-brand-700 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          עדכון
        </button>
      </div>
      <StatusMessage message={message} />
    </form>
  );
}
