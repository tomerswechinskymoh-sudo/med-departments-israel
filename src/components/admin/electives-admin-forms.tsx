"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

type DepartmentOption = {
  id: string;
  label: string;
};

type ElectiveAccountInitial = {
  username: string;
  isActive: boolean;
} | null;

type ElectiveSettingsInitial = {
  maxStudentsAtOnce: number;
  availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT";
  contactEmail?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/electives/settings", {
        departmentId,
        maxStudentsAtOnce: Number(form.get("maxStudentsAtOnce") ?? 1),
        availabilityMode,
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        instructions: String(form.get("instructions") ?? ""),
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
      </div>
      <textarea
        name="instructions"
        defaultValue={initialSettings?.instructions ?? ""}
        placeholder="הנחיות למחלקה / לסטודנטים בעתיד"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
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
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
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
      <div className="grid gap-3 md:grid-cols-4">
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
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
          <option value="SUBMITTED">הוגש</option>
          <option value="UNDER_REVIEW">בבדיקה</option>
          <option value="ACCEPTED">אושר</option>
          <option value="REJECTED">נדחה</option>
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
