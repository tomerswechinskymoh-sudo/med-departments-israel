"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type DunsBatch = {
  id: string;
  sourceUrl?: string | null;
  sourceType?: string;
  target?: string;
  extractionInstruction?: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FAILED" | "FAILED_NEEDS_ASSISTED_IMPORT";
  parsedJson?: unknown;
  createdAt: Date | string;
  records: Array<{
    id: string;
    physicianName?: string | null;
    roleTitle?: string | null;
    hospitalNameRaw?: string | null;
    specialtyRaw?: string | null;
    sourceSnippet?: string | null;
    sourceLabel?: string | null;
    confidenceScore?: number | null;
    normalizedHospitalId?: string | null;
    normalizedSpecialtyId?: string | null;
    normalizedDepartmentId?: string | null;
  }>;
};

type DunsOption = {
  id: string;
  name: string;
};

type DataImportJob = {
  id: string;
  rootUrl: string;
  status: "RUNNING" | "FAILED" | "PARTIAL" | "COMPLETED";
  maxPages: number;
  yearsDepth: number;
  progressJson?: unknown;
  errorMessage?: string | null;
  batchId?: string | null;
};

function batchSummary(batch: DunsBatch) {
  if (!batch.parsedJson || typeof batch.parsedJson !== "object" || Array.isArray(batch.parsedJson)) {
    return [];
  }
  const summary = (batch.parsedJson as { summary?: unknown }).summary;
  return Array.isArray(summary)
    ? summary.filter(
        (item): item is { hospitalName: string; specialtyName: string; count: number } =>
          Boolean(item) &&
          typeof item === "object" &&
          "hospitalName" in item &&
          "specialtyName" in item &&
          "count" in item
      )
    : [];
}

function processingSummary(batch: DunsBatch) {
  if (!batch.parsedJson || typeof batch.parsedJson !== "object" || Array.isArray(batch.parsedJson)) {
    return null;
  }
  const summary = (batch.parsedJson as { processingSummary?: unknown }).processingSummary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const record = summary as Record<string, unknown>;
  return {
    pagesProcessed: typeof record.pagesProcessed === "number" ? record.pagesProcessed : 0,
    recordsExtracted: typeof record.recordsExtracted === "number" ? record.recordsExtracted : 0,
    matchedRecords: typeof record.matchedRecords === "number" ? record.matchedRecords : 0,
    unmatchedRecords: typeof record.unmatchedRecords === "number" ? record.unmatchedRecords : 0
  };
}

export function DunsImportPanel({
  batches,
  jobs,
  institutions,
  specialties,
  departments
}: {
  batches: DunsBatch[];
  jobs: DataImportJob[];
  institutions: DunsOption[];
  specialties: DunsOption[];
  departments: Array<DunsOption & { institutionId: string; specialtyId: string }>;
}) {
  const [items, setItems] = useState(batches);
  const [jobItems, setJobItems] = useState(jobs);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  function jobProgress(job: DataImportJob) {
    if (!job.progressJson || typeof job.progressJson !== "object" || Array.isArray(job.progressJson)) {
      return null;
    }
    const progress = job.progressJson as Record<string, unknown>;
    return {
      categories: typeof progress.categoriesDiscovered === "number" ? progress.categoriesDiscovered : 0,
      years: typeof progress.yearsDiscovered === "number" ? progress.yearsDiscovered : 0,
      pages: typeof progress.pagesVisited === "number" ? progress.pagesVisited : 0,
      physicians: typeof progress.physiciansExtracted === "number" ? progress.physiciansExtracted : 0,
      failedPages: typeof progress.failedPages === "number" ? progress.failedPages : 0
    };
  }

  async function startCrawler(event: FormEvent<HTMLFormElement>, resumeJobId?: string) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/data-import-jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rootUrl: formData.get("rootUrl"),
        maxPages: formData.get("maxPages"),
        yearsDepth: formData.get("yearsDepth"),
        allowedDomains: formData.get("allowedDomains"),
        resumeJobId
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "סריקת DUNS100 נכשלה.");
      if (payload.job) {
        setJobItems((current) => [payload.job, ...current.filter((job) => job.id !== payload.job.id)]);
      }
      return;
    }

    setMessage(payload.message ?? "סריקת DUNS100 הסתיימה.");
    if (payload.job) {
      setJobItems((current) => [payload.job, ...current.filter((job) => job.id !== payload.job.id)]);
    }
    if (payload.batch) {
      setItems((current) => [payload.batch, ...current]);
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const fileInput = event.currentTarget.elements.namedItem("uploadedFiles") as HTMLInputElement | null;
    const uploadedFiles = await Promise.all(
      Array.from(fileInput?.files ?? []).slice(0, 12).map(async (file) => ({
        fileName: file.name,
        content: await file.text()
      }))
    );

    const response = await fetch("/api/admin/data-imports", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sourceType: formData.get("sourceType"),
        target: formData.get("target"),
        extractionInstruction: formData.get("extractionInstruction"),
        sourceUrl: formData.get("sourceUrl"),
        additionalSourceUrls: formData.get("additionalSourceUrls"),
        pastedContent: formData.get("pastedContent"),
        uploadedFiles
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "ייבוא DUNS100 נכשל.");
      if (payload.batch) {
        setItems((current) => [payload.batch, ...current]);
      }
      return;
    }

    setMessage(payload.message ?? "ייבוא נשמר.");
    setItems((current) => [payload.batch, ...current]);
    event.currentTarget.reset();
  }

  async function reviewBatch(batchId: string, action: "approve" | "reject") {
    setIsBusy(true);
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/admin/data-imports/${batchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ action })
    });
    const payload = await response.json().catch(() => ({}));
    setIsBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "עדכון הייבוא נכשל.");
      return;
    }

    setMessage(payload.message ?? "הייבוא עודכן.");
    setItems((current) =>
      current.map((batch) => (batch.id === batchId ? { ...batch, status: payload.batch.status } : batch))
    );
  }

  async function mapRecord(batchId: string, recordId: string, formData: FormData) {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/data-imports/${batchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: "mapRecord",
        recordId,
        normalizedHospitalId: formData.get("normalizedHospitalId") || null,
        normalizedSpecialtyId: formData.get("normalizedSpecialtyId") || null,
        normalizedDepartmentId: formData.get("normalizedDepartmentId") || null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "שמירת המיפוי נכשלה.");
      return;
    }

    setMessage(payload.message ?? "המיפוי נשמר.");
    setItems((current) =>
      current.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              records: batch.records.map((record) =>
                record.id === recordId
                  ? {
                      ...record,
                      normalizedHospitalId: payload.record?.normalizedHospitalId ?? null,
                      normalizedSpecialtyId: payload.record?.normalizedSpecialtyId ?? null,
                      normalizedDepartmentId: payload.record?.normalizedDepartmentId ?? null
                    }
                  : record
              )
            }
          : batch
      )
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={startCrawler} className="grid gap-3 rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4">
        <div>
          <p className="text-base font-black text-ink">סריקת DUNS100 אוטומטית</p>
          <p className="mt-1 text-sm leading-7 text-slate-600">
            מזינים URL שורש אחד. המערכת תפתח דפדפן, תגלה קטגוריות רפואיות ושנות דירוג, ותיצור רשומות רופאים ממתינות לאישור.
          </p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Root URL</span>
          <input
            name="rootUrl"
            type="url"
            required
            defaultValue="https://www.duns100.co.il/rating/Duns_100_medical"
            className="min-h-12 w-full rounded-2xl border border-brand-100 px-4 text-sm outline-none focus:border-brand-300"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">מקסימום עמודים</span>
            <input name="maxPages" type="number" min={1} max={250} defaultValue={80} className="min-h-12 w-full rounded-2xl border border-brand-100 px-4 text-sm outline-none focus:border-brand-300" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">עומק שנים</span>
            <input name="yearsDepth" type="number" min={1} max={20} defaultValue={5} className="min-h-12 w-full rounded-2xl border border-brand-100 px-4 text-sm outline-none focus:border-brand-300" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">דומיינים מורשים</span>
            <input name="allowedDomains" placeholder="duns100.co.il" className="min-h-12 w-full rounded-2xl border border-brand-100 px-4 text-sm outline-none focus:border-brand-300" />
          </label>
        </div>
        <Button disabled={isBusy}>{isBusy ? "סורק..." : "התחל סריקת DUNS100"}</Button>
      </form>

      {jobItems.length > 0 ? (
        <div className="space-y-3 rounded-[1.5rem] border border-slate-100 bg-white p-4">
          <p className="text-sm font-black text-ink">עבודות סריקה אחרונות</p>
          {jobItems.map((job) => {
            const progress = jobProgress(job);
            return (
              <div key={job.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-ink">{job.status} · {job.rootUrl}</span>
                  {(job.status === "FAILED" || job.status === "PARTIAL") ? (
                    <form onSubmit={(event) => startCrawler(event, job.id)}>
                      <input type="hidden" name="rootUrl" value={job.rootUrl} />
                      <input type="hidden" name="maxPages" value={job.maxPages} />
                      <input type="hidden" name="yearsDepth" value={job.yearsDepth} />
                      <Button type="submit" variant="secondary" disabled={isBusy}>המשך סריקה</Button>
                    </form>
                  ) : null}
                </div>
                {progress ? (
                  <p className="mt-2 leading-6">
                    {progress.categories} קטגוריות · {progress.years} שנים · {progress.pages} עמודים · {progress.physicians} רופאים · {progress.failedPages} כשלונות
                  </p>
                ) : null}
                {job.errorMessage ? <p className="mt-1 text-red-700">{job.errorMessage}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <form onSubmit={submitImport} className="grid gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
          ייבוא ידני מיועד למקורות שאינם DUNS100. עבור DUNS100 השתמשו בסריקה האוטומטית למעלה.
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">סוג מקור</span>
            <select
              name="sourceType"
              defaultValue="HOSPITAL_WEBSITE"
              className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-sm outline-none focus:border-brand-300"
            >
              <option value="HOSPITAL_WEBSITE">אתר בית חולים</option>
              <option value="MINISTRY_REPORT">דו״ח משרד הבריאות</option>
              <option value="MANUAL_PASTE">הדבקה ידנית</option>
              <option value="OTHER">אחר</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">יעד ייבוא</span>
            <select
              name="target"
              defaultValue="DEPARTMENT_LEADERSHIP"
              className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-sm outline-none focus:border-brand-300"
            >
              <option value="DEPARTMENT_METRICS">מדדי מחלקה</option>
              <option value="DEPARTMENT_LEADERSHIP">הנהלה ופרטי קשר</option>
              <option value="RESIDENCY_OPENINGS">תקני התמחות ודדליינים</option>
              <option value="CUSTOM">ייבוא חופשי</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">הנחיית חילוץ</span>
          <textarea
            name="extractionInstruction"
            rows={2}
            defaultValue="Extract DUNS100 physicians and match them to departments"
            className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm outline-none focus:border-brand-300"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">URL ציבורי</span>
          <input
            name="sourceUrl"
            type="url"
            placeholder="https://www.duns100.co.il/..."
            className="min-h-12 w-full rounded-2xl border border-brand-100 px-4 text-sm outline-none focus:border-brand-300"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">כתובות ילדים / מקורות נוספים</span>
          <textarea
            name="additionalSourceUrls"
            rows={3}
            placeholder="אפשר להדביק כמה כתובות, כל אחת בשורה נפרדת"
            className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm outline-none focus:border-brand-300"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">הדבקת תוכן מרובה עמודים</span>
          <textarea
            name="pastedContent"
            rows={7}
            placeholder="אפשר להדביק כאן תוכן מכמה עמודים. להפרדה בין עמודים אפשר להשתמש בשורה עם ---"
            className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm outline-none focus:border-brand-300"
          />
        </label>
        <label className="block rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-4">
          <span className="mb-2 block text-sm font-bold text-ink">העלאת קובצי HTML / TXT</span>
          <input
            name="uploadedFiles"
            type="file"
            multiple
            accept=".html,.htm,.txt,text/html,text/plain"
            className="block w-full text-sm text-slate-600 file:me-4 file:rounded-full file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
          />
          <span className="mt-2 block text-xs leading-5 text-slate-500">
            מיועד לאתרים שחוסמים סריקה אוטומטית. אפשר לשמור עמודים מהדפדפן ולהעלות אותם יחד.
          </span>
        </label>
        <Button disabled={isBusy}>{isBusy ? "מעבד..." : "סרוק מקור ופתח לביקורת"}</Button>
      </form>

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין עדיין ייבואי נתונים.</p>
        ) : (
          items.map((batch) => {
            const summary = batchSummary(batch);
            const stats = processingSummary(batch);
            const unmatched = batch.records.filter((record) => !record.normalizedDepartmentId);

            return (
              <div key={batch.id} className="rounded-[1.5rem] border border-brand-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">ייבוא נתונים · {batch.sourceType ?? "DUNS100"} · {batch.status}</p>
                    <p className="mt-1 text-xs text-slate-500">{batch.target ?? "DUNS100_PHYSICIANS"}</p>
                    <p className="mt-1 text-xs text-slate-500">{batch.sourceUrl ?? "תוכן מודבק"}</p>
                  </div>
                  {batch.status === "PENDING_REVIEW" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => reviewBatch(batch.id, "approve")} disabled={isBusy}>
                        אישור ייבוא
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => reviewBatch(batch.id, "reject")} disabled={isBusy}>
                        דחייה
                      </Button>
                    </div>
                  ) : null}
                </div>
                {batch.status === "FAILED_NEEDS_ASSISTED_IMPORT" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
                    <p className="font-black">האתר חסם סריקה אוטומטית</p>
                    <p>ניתן להעלות קובצי HTML או להדביק תוכן מכמה עמודים, ואז להריץ שוב את הייבוא.</p>
                  </div>
                ) : null}

                {stats ? (
                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
                    <span className="rounded-2xl bg-slate-50 px-3 py-2 font-bold text-slate-700">עמודים/קבצים: {stats.pagesProcessed}</span>
                    <span className="rounded-2xl bg-slate-50 px-3 py-2 font-bold text-slate-700">רשומות: {stats.recordsExtracted}</span>
                    <span className="rounded-2xl bg-emerald-50 px-3 py-2 font-bold text-emerald-800">שויכו: {stats.matchedRecords}</span>
                    <span className="rounded-2xl bg-amber-50 px-3 py-2 font-bold text-amber-800">דורשות מיפוי: {stats.unmatchedRecords}</span>
                  </div>
                ) : null}

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.8fr] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <span>רשומה</span>
                    <span>מוסד</span>
                    <span>תחום / מחלקה</span>
                    <span>ביטחון</span>
                    <span>מקור</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {batch.records.slice(0, 10).map((record) => (
                      <div key={record.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.8fr] gap-2 px-3 py-3 text-xs text-slate-700">
                        <span className="font-bold text-ink">{record.physicianName ?? "רשומה כללית"}</span>
                        <span>{record.hospitalNameRaw ?? "לא זוהה"}</span>
                        <span>{record.specialtyRaw ?? "לא זוהה"}</span>
                        <span>{typeof record.confidenceScore === "number" ? `${Math.round(record.confidenceScore * 100)}%` : "לא ידוע"}</span>
                        <span>{record.sourceLabel ?? "מקור"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {summary.slice(0, 6).map((item) => (
                    <p key={`${item.hospitalName}:${item.specialtyName}`} className="rounded-2xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900">
                      {item.hospitalName} · {item.specialtyName}: {item.count}
                    </p>
                  ))}
                </div>
                {unmatched.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="text-xs font-bold text-amber-900">תיקון מיפוי ידני לפני אישור</p>
                    <div className="mt-3 space-y-3">
                      {unmatched.slice(0, 8).map((record) => (
                        <form
                          key={record.id}
                          onSubmit={(event) => {
                            event.preventDefault();
                            mapRecord(batch.id, record.id, new FormData(event.currentTarget));
                          }}
                          className="grid gap-2 rounded-2xl bg-white/75 p-3 text-xs text-amber-950 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
                        >
                          <div>
                            <p className="font-bold">{record.physicianName ?? "רשומה כללית"}</p>
                            <p className="mt-1 text-amber-900/70">
                              {record.roleTitle ?? record.sourceSnippet ?? `${record.hospitalNameRaw ?? "לא זוהה"} · ${record.specialtyRaw ?? "לא זוהה"}`}
                            </p>
                          </div>
                          <select
                            name="normalizedHospitalId"
                            defaultValue={record.normalizedHospitalId ?? ""}
                            className="min-h-10 rounded-xl border border-amber-200 bg-white px-3 outline-none"
                          >
                            <option value="">בחירת מוסד</option>
                            {institutions.map((institution) => (
                              <option key={institution.id} value={institution.id}>
                                {institution.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="normalizedSpecialtyId"
                            defaultValue={record.normalizedSpecialtyId ?? ""}
                            className="min-h-10 rounded-xl border border-amber-200 bg-white px-3 outline-none"
                          >
                            <option value="">בחירת תחום</option>
                            {specialties.map((specialty) => (
                              <option key={specialty.id} value={specialty.id}>
                                {specialty.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="normalizedDepartmentId"
                            defaultValue={record.normalizedDepartmentId ?? ""}
                            className="min-h-10 rounded-xl border border-amber-200 bg-white px-3 outline-none"
                          >
                            <option value="">בחירת מחלקה</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="secondary" disabled={isBusy}>
                            שמירה
                          </Button>
                        </form>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
