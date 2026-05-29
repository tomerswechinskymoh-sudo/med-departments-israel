"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type ScrapeRevision = {
  id: string;
  sourceUrl: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FAILED";
  confidenceScore?: number | null;
  adminNotes?: string | null;
  proposedDepartmentHeadTitle?: string | null;
  proposedDepartmentHeadName?: string | null;
  proposedDepartmentHeadEmail?: string | null;
  proposedDepartmentHeadPhone?: string | null;
  proposedContactTitle?: string | null;
  proposedContactRole?: string | null;
  proposedContactName?: string | null;
  proposedContactEmail?: string | null;
  proposedContactPhone?: string | null;
  proposedDescription?: string | null;
  proposedSeniorPhysiciansCount?: number | null;
  proposedBedsCount?: number | null;
  proposedResearchActivity?: string | null;
  proposedApplicationUrl?: string | null;
  suggestedEmailsJson?: unknown;
  extractedJson?: unknown;
  createdAt: string;
};

type CurrentDepartmentSnapshot = {
  about?: string | null;
  contactName?: string | null;
  publicContactEmail?: string | null;
  publicContactPhone?: string | null;
  applicationUrl?: string | null;
  metrics?: Array<{
    metricKey: string;
    value?: number | null;
    rawValue?: string | null;
  }>;
};

const requesterRoleLabels = [
  { value: "RESIDENT", label: "מתמחה" },
  { value: "SPECIALIST", label: "מומחה" },
  { value: "DEPARTMENT_STAFF", label: "צוות המחלקה" }
];

function statusLabel(status: ScrapeRevision["status"]) {
  if (status === "PENDING_REVIEW") return "ממתין לבדיקה";
  if (status === "APPROVED") return "אושר";
  if (status === "REJECTED") return "נדחה";
  return "נכשל";
}

function stringArrayFromUnknown(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function suggestedEmailsForRevision(revision?: ScrapeRevision) {
  if (!revision) return [];

  const directSuggestions = stringArrayFromUnknown(revision.suggestedEmailsJson);
  if (directSuggestions.length > 0) {
    return directSuggestions;
  }

  const extractedJson =
    revision.extractedJson && typeof revision.extractedJson === "object" && !Array.isArray(revision.extractedJson)
      ? (revision.extractedJson as { scrapeDiagnostics?: { extractedEmails?: unknown } })
      : null;
  const diagnosticEmails = stringArrayFromUnknown(extractedJson?.scrapeDiagnostics?.extractedEmails);

  return diagnosticEmails;
}

function normalizeEmailValue(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[＠﹫]/g, "@")
    .replace(/[．。]/g, ".")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*\.\s*/g, ".")
    .trim();
}

function cleanInputValue(value: string | null | undefined) {
  if (!value || value === "null") return "";
  return value;
}

export function DepartmentPageActions({
  departmentId,
  isAdmin,
  showAdminScrape = false,
  showMistake = false,
  showClaim = false,
  className
}: {
  departmentId: string;
  isAdmin: boolean;
  showAdminScrape?: boolean;
  showMistake?: boolean;
  showClaim?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"scrape" | "mistake" | "claim" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [revisions, setRevisions] = useState<ScrapeRevision[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<CurrentDepartmentSnapshot | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const revisionFormRef = useRef<HTMLFormElement | null>(null);

  const selectedRevision = revisions.find((revision) => revision.id === selectedRevisionId) ?? revisions[0];
  const suggestedEmails = suggestedEmailsForRevision(selectedRevision);

  function resetState() {
    setMessage(null);
    setError(null);
    setCopiedEmail(null);
    setLoading(false);
  }

  function closeModal() {
    setActiveModal(null);
    resetState();
  }

  async function loadRevisions() {
    if (!isAdmin) return;

    const response = await fetch(`/api/admin/departments/${departmentId}/scrape-revisions`);
    if (!response.ok) return;

    const data = (await response.json()) as {
      revisions: ScrapeRevision[];
      current?: CurrentDepartmentSnapshot | null;
    };
    setRevisions(data.revisions);
    setCurrentSnapshot(data.current ?? null);
    setSelectedRevisionId(data.revisions[0]?.id ?? null);
  }

  useEffect(() => {
    if (activeModal === "scrape") {
      void loadRevisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  async function submitScrape(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetState();
    setLoading(true);

    const response = await fetch(`/api/admin/departments/${departmentId}/scrape-revisions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl: scrapeUrl })
    });
    const data = await response.json().catch(() => ({}));

    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "הסריקה נכשלה.");
      await loadRevisions();
      return;
    }

    setScrapeUrl("");
    setMessage("הסריקה נשמרה כדראפט לבדיקה.");
    await loadRevisions();
  }

  async function refreshResearchMetrics() {
    if (!isAdmin) return;

    resetState();
    setLoading(true);
    const response = await fetch(`/api/admin/departments/${departmentId}/research-metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "ריענון OpenAlex נכשל.");
      return;
    }

    setMessage(data.message ?? "מדדי OpenAlex עודכנו.");
    router.refresh();
  }

  async function patchRevision(action: "update" | "approve" | "reject", formData: FormData) {
    if (!selectedRevision) return;

    resetState();
    setLoading(true);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(`/api/admin/department-scrape-revisions/${selectedRevision.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, action })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "שמירת הדראפט נכשלה.");
      return;
    }

    setMessage(
      action === "approve"
        ? "הדראפט אושר והמידע הציבורי עודכן."
        : action === "reject"
          ? "הדראפט נדחה."
          : "הדראפט נשמר."
    );
    await loadRevisions();
  }

  async function submitMistake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetState();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/departments/${departmentId}/mistake-reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "שליחת הדיווח נכשלה.");
      return;
    }

    setMessage(data.message ?? "הדיווח נשמר.");
    event.currentTarget.reset();
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetState();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/departments/${departmentId}/representative-requests`, {
      method: "POST",
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "שליחת הבקשה נכשלה.");
      return;
    }

    setMessage(data.message ?? "הבקשה נשמרה.");
    event.currentTarget.reset();
  }

  function insertEmail(fieldName: "proposedDepartmentHeadEmail" | "proposedContactEmail", email: string) {
    const normalizedEmail = normalizeEmailValue(email);
    console.debug("[scrape-email-normalize] insertEmail", {
      raw: email,
      normalized: normalizedEmail
    });

    const input = revisionFormRef.current?.elements.namedItem(fieldName);
    if (input instanceof HTMLInputElement) {
      input.value = normalizedEmail;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  }

  function currentMetric(metricKey: string) {
    const metric = currentSnapshot?.metrics?.find((item) => item.metricKey === metricKey);
    if (!metric) return "";
    return metric.rawValue ?? (typeof metric.value === "number" ? String(metric.value) : "");
  }

  function comparisonRows(revision: ScrapeRevision) {
    return [
      ["תיאור", currentSnapshot?.about, revision.proposedDescription],
      ["איש קשר", currentSnapshot?.contactName, revision.proposedContactName],
      ["אימייל ציבורי", currentSnapshot?.publicContactEmail, revision.proposedContactEmail ?? revision.proposedDepartmentHeadEmail],
      ["טלפון ציבורי", currentSnapshot?.publicContactPhone, revision.proposedContactPhone ?? revision.proposedDepartmentHeadPhone],
      ["מספר בכירים", currentMetric("seniorPhysiciansCount"), revision.proposedSeniorPhysiciansCount?.toString()],
      ["מספר מיטות", currentMetric("bedsCount"), revision.proposedBedsCount?.toString()],
      ["פעילות מחקרית", currentMetric("researchActivityText"), revision.proposedResearchActivity],
      ["קישור הגשה", currentSnapshot?.applicationUrl, revision.proposedApplicationUrl]
    ].filter(([, current, proposed]) => cleanInputValue(current) || cleanInputValue(proposed));
  }

  function normalizeRevisionEmailInputs(form: HTMLFormElement) {
    for (const fieldName of ["proposedDepartmentHeadEmail", "proposedContactEmail"] as const) {
      const input = form.elements.namedItem(fieldName);
      if (!(input instanceof HTMLInputElement)) continue;

      const raw = input.value;
      const normalized = normalizeEmailValue(raw);
      console.debug("[scrape-email-normalize] submit", {
        fieldName,
        raw,
        normalized
      });
      input.value = normalized;
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {isAdmin && showAdminScrape ? (
        <section className="rounded-[1.5rem] border border-brand-200 bg-gradient-to-l from-brand-50 via-white to-amber-50/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-ink">ניהול מידע מחלקה</p>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                סריקה יוצרת דראפט לבדיקה בלבד. שום מידע לא מתפרסם לפני אישור אדמין.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("scrape")}
              className="inline-flex items-center justify-center rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-bold text-brand-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              סריקת מידע מאתר המחלקה
            </button>
            <button
              type="button"
              onClick={refreshResearchMetrics}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-bold text-brand-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50 disabled:opacity-60"
            >
              {loading ? "מעדכן..." : "עדכון OpenAlex למחלקה"}
            </button>
          </div>
          {message ? <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}
        </section>
      ) : null}

      {showClaim ? (
        <button
          type="button"
          onClick={() => setActiveModal("claim")}
          className="inline-flex items-center justify-center rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-bold text-brand-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50"
        >
          אני מתמחה במחלקה הזו
        </button>
      ) : null}

      {showMistake ? (
        <section className="rounded-[1.25rem] border border-red-100 bg-red-50/65 p-4">
          <p className="text-sm font-bold text-red-950">משהו לא מדויק?</p>
          <p className="mt-1 text-xs leading-6 text-red-800/80">
            הדיווח נשמר לבדיקה פנימית ולא מופיע באתר.
          </p>
          <button
            type="button"
            onClick={() => setActiveModal("mistake")}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-50"
          >
            דיווח על טעות
          </button>
        </section>
      ) : null}

      <Modal
        open={activeModal === "scrape"}
        onClose={closeModal}
        title="סריקת מידע מאתר המחלקה"
        description="הסריקה נשמרת כדראפט בלבד. רק אישור מנהל יעדכן מידע ציבורי."
        className="max-w-6xl"
      >
        <div className="space-y-5">
          {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}
          <form onSubmit={submitScrape} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">
                הדביקו קישור לעמוד המחלקה באתר המרכז הרפואי
              </span>
              <input
                type="url"
                required
                value={scrapeUrl}
                onChange={(event) => setScrapeUrl(event.target.value)}
                placeholder="https://example.org/department"
                className="min-h-12 w-full rounded-2xl border border-brand-100 px-4 text-sm outline-none focus:border-brand-300"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="self-end rounded-2xl bg-brand-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? "סורק..." : "התחל סריקה"}
            </button>
          </form>

          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {revisions.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">אין עדיין דראפטים.</p>
              ) : (
                revisions.map((revision) => (
                  <button
                    key={revision.id}
                    type="button"
                    onClick={() => setSelectedRevisionId(revision.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-right text-sm transition ${
                      selectedRevision?.id === revision.id
                        ? "border-brand-300 bg-brand-50 text-brand-900"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block font-bold">{statusLabel(revision.status)}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{revision.sourceUrl}</span>
                  </button>
                ))
              )}
            </div>

            {selectedRevision ? (
              <form
                ref={revisionFormRef}
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  normalizeRevisionEmailInputs(event.currentTarget);
                  void patchRevision("update", new FormData(event.currentTarget));
                }}
              >
                {comparisonRows(selectedRevision).length > 0 ? (
                  <div className="overflow-hidden rounded-[1.25rem] border border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-2 bg-white px-3 py-2 text-xs font-black text-slate-600">
                      <span>שדה</span>
                      <span>קיים</span>
                      <span>מוצע</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs text-slate-700">
                      {comparisonRows(selectedRevision).map(([label, current, proposed]) => (
                        <div key={label} className="grid grid-cols-[0.8fr_1fr_1fr] gap-2 px-3 py-2">
                          <span className="font-bold text-ink">{label}</span>
                          <span className="line-clamp-3">{cleanInputValue(current) || "אין"}</span>
                          <span className="line-clamp-3 font-bold text-brand-900">{cleanInputValue(proposed) || "אין"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/75 p-4">
                  <p className="text-sm font-bold text-amber-950">אימיילים שנמצאו בעמוד</p>
                  <p className="mt-1 text-xs leading-6 text-amber-900/80">
                    כתובות שנמצאו באופן דטרמיניסטי בעמוד. אם יש כמה כתובות, המערכת לא מנחשת
                    תפקיד ואפשר לשבץ ידנית בשדה המתאים.
                  </p>
                  {suggestedEmails.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {suggestedEmails.map((email) => (
                        <div
                          key={email}
                          className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(email);
                              setCopiedEmail(email);
                            }}
                            className="text-right text-xs font-bold text-amber-950 underline-offset-4 transition hover:underline"
                            title="העתקת אימייל"
                          >
                            <span dir="ltr">{email}</span>
                            {copiedEmail === email ? " · הועתק" : ""}
                          </button>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => insertEmail("proposedDepartmentHeadEmail", email)}
                              className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
                            >
                              הכנס כמייל מנהל
                            </button>
                            <button
                              type="button"
                              onClick={() => insertEmail("proposedContactEmail", email)}
                              className="rounded-full bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-950 transition hover:bg-amber-300"
                            >
                              הכנס כמייל איש קשר
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                      לא נמצאו אימיילים בעמוד בסריקה הנוכחית.
                    </p>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="proposedDepartmentHeadTitle" defaultValue={cleanInputValue(selectedRevision.proposedDepartmentHeadTitle)} placeholder="תואר מנהל/ת" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedDepartmentHeadName" defaultValue={cleanInputValue(selectedRevision.proposedDepartmentHeadName)} placeholder="שם מנהל/ת" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedDepartmentHeadEmail" defaultValue={cleanInputValue(selectedRevision.proposedDepartmentHeadEmail)} placeholder="אימייל מנהל/ת" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedDepartmentHeadPhone" defaultValue={cleanInputValue(selectedRevision.proposedDepartmentHeadPhone)} placeholder="טלפון מנהל/ת" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedContactTitle" defaultValue={cleanInputValue(selectedRevision.proposedContactTitle)} placeholder="תואר איש קשר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedContactRole" defaultValue={cleanInputValue(selectedRevision.proposedContactRole)} placeholder="תפקיד איש קשר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedContactName" defaultValue={cleanInputValue(selectedRevision.proposedContactName)} placeholder="שם איש קשר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedContactEmail" defaultValue={cleanInputValue(selectedRevision.proposedContactEmail)} placeholder="אימייל איש קשר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedContactPhone" defaultValue={cleanInputValue(selectedRevision.proposedContactPhone)} placeholder="טלפון איש קשר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedSeniorPhysiciansCount" defaultValue={selectedRevision.proposedSeniorPhysiciansCount ?? ""} placeholder="מספר בכירים לפי האתר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedBedsCount" defaultValue={selectedRevision.proposedBedsCount ?? ""} placeholder="מספר מיטות אם נמצא" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                  <input name="proposedApplicationUrl" defaultValue={cleanInputValue(selectedRevision.proposedApplicationUrl)} placeholder="קישור הגשה אם נמצא" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm md:col-span-2" />
                </div>
                <textarea name="proposedDescription" defaultValue={cleanInputValue(selectedRevision.proposedDescription)} rows={5} placeholder="תיאור מוצע בעברית" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                <textarea name="proposedResearchActivity" defaultValue={cleanInputValue(selectedRevision.proposedResearchActivity)} rows={4} placeholder="פעילות מחקרית / אקדמית לפי האתר" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                <textarea name="adminNotes" defaultValue={cleanInputValue(selectedRevision.adminNotes)} rows={3} placeholder="הערות מנהל" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={loading} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-bold text-brand-800">שמירת עריכה</button>
                  <button type="button" disabled={loading} onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (!form) return;
                    normalizeRevisionEmailInputs(form);
                    void patchRevision("approve", new FormData(form));
                  }} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white">אישור ופרסום</button>
                  <button type="button" disabled={loading} onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (!form) return;
                    normalizeRevisionEmailInputs(form);
                    void patchRevision("reject", new FormData(form));
                  }} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700">דחייה</button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal open={activeModal === "mistake"} onClose={closeModal} title="דיווח על טעות" description="הדיווח נשמר לבדיקה פנימית בלבד ולא יוצג באתר.">
        <form onSubmit={submitMistake} className="space-y-4">
          {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}
          <textarea name="explanation" required maxLength={250} rows={4} placeholder="מה הטעות? עד 250 תווים" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
          <div className="grid gap-3 md:grid-cols-3">
            <input name="reporterName" required placeholder="שם" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            <input name="reporterEmail" required type="email" placeholder="אימייל" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            <input name="reporterPhone" placeholder="טלפון, לא חובה" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
          </div>
          <button disabled={loading} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-bold text-white">שליחת דיווח</button>
        </form>
      </Modal>

      <Modal open={activeModal === "claim"} onClose={closeModal} title="אני מתמחה במחלקה הזו" description="בקשה זו נבדקת על ידי מנהל. הרשאות נציגות לא ניתנות אוטומטית.">
        <form onSubmit={submitClaim} className="space-y-4">
          {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <input name="requesterName" required placeholder="שם מלא" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            <input name="requesterEmail" required type="email" placeholder="אימייל" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            <input name="requesterPhone" required placeholder="טלפון" className="rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            <select name="requesterRole" required className="rounded-2xl border border-brand-100 px-4 py-3 text-sm">
              {requesterRoleLabels.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <textarea name="note" maxLength={500} rows={4} placeholder="הערה קצרה, לא חובה" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
          <label className="block rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-4 text-sm font-semibold text-brand-900">
            מסמך הוכחה, לא חובה
            <input name="proofDocument" type="file" className="mt-3 block w-full text-xs text-slate-600" />
          </label>
          <button disabled={loading} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-bold text-white">שליחת בקשה</button>
        </form>
      </Modal>
    </div>
  );
}
