"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

type DepartmentOption = {
  id: string;
  label: string;
};

type DemoResponse = {
  message?: string;
  error?: string;
  temporaryPassword?: string;
  summary?: Record<string, number | string | boolean | null>;
};

type DemoSummary = NonNullable<DemoResponse["summary"]> | null;

async function postDemo(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => null)) as DemoResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "פעולת הדמו נכשלה.");
  }

  return payload ?? {};
}

function OneTimePasswordNotice({ password }: { password: string | null }) {
  if (!password) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
      <p className="font-black">סיסמה זמנית - מוצגת פעם אחת בלבד</p>
      <code className="mt-2 block select-all rounded-xl bg-white px-3 py-2 text-left text-sm font-black text-slate-900" dir="ltr">
        {password}
      </code>
    </div>
  );
}

function SummaryList({ summary }: { summary: DemoSummary }) {
  if (!summary) {
    return null;
  }

  return (
    <dl className="grid gap-2 text-xs font-semibold text-slate-600 md:grid-cols-2">
      {Object.entries(summary).map(([key, value]) => (
        <div key={key} className="rounded-xl bg-white px-3 py-2">
          <dt className="text-slate-400">{key}</dt>
          <dd className="mt-1 text-slate-800">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ElectivesDemoTools({ departments }: { departments: DepartmentOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [summary, setSummary] = useState<DemoSummary>(null);
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [isWorking, setIsWorking] = useState(false);

  async function run(action: "seed" | "resetPassword") {
    setIsWorking(true);
    setMessage(null);
    setTemporaryPassword(null);
    setSummary(null);

    try {
      const payload = await postDemo("/api/admin/electives/demo", {
        action,
        departmentId: departmentId || undefined
      });
      setMessage(payload.message ?? "פעולת הדמו הסתיימה.");
      setTemporaryPassword(payload.temporaryPassword ?? null);
      setSummary(payload.summary ?? null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "פעולת הדמו נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div>
        <p className="text-sm font-black text-amber-950">כלי QA פנימיים לאלקטיבים</p>
        <p className="mt-1 text-xs leading-6 text-amber-900">
          יוצר נתוני בדיקה אדמין בלבד. סיסמה זמנית מוצגת בתגובה אחת ולא נשמרת כטקסט גלוי.
        </p>
      </div>
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void run("seed");
        }}
        className="grid gap-3 md:grid-cols-[1fr_auto_auto]"
      >
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none"
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isWorking || !departmentId}
          className="rounded-full bg-amber-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          יצירת דמו מלא
        </button>
        <button
          type="button"
          onClick={() => void run("resetPassword")}
          disabled={isWorking || !departmentId}
          className="rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-black text-amber-900 disabled:opacity-60"
        >
          איפוס סיסמה זמנית
        </button>
      </form>
      {message ? <p className="text-xs font-semibold text-amber-950">{message}</p> : null}
      <OneTimePasswordNotice password={temporaryPassword} />
      <SummaryList summary={summary} />
    </div>
  );
}

export function FellowshipsDemoTools() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<DemoSummary>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function run() {
    setIsWorking(true);
    setMessage(null);
    setSummary(null);

    try {
      const payload = await postDemo("/api/admin/fellowships/demo", {
        action: "seed"
      });
      setMessage(payload.message ?? "נתוני הדמו נוצרו.");
      setSummary(payload.summary ?? null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "פעולת הדמו נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div>
        <p className="text-sm font-black text-amber-950">כלי QA פנימיים לפלושיפים</p>
        <p className="mt-1 text-xs leading-6 text-amber-900">
          יוצר תחומי פלושיפ, תוכניות וניסיון ישראלי עם שלושת מצבי החשיפה. לא נחשף לציבור.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={isWorking}
        className="rounded-full bg-amber-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        יצירת דמו פלושיפים
      </button>
      {message ? <p className="text-xs font-semibold text-amber-950">{message}</p> : null}
      <SummaryList summary={summary} />
    </div>
  );
}
