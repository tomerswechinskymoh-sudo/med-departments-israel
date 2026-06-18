"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

type CsvPreview = {
  kind: "spec" | "dept";
  fileName: string | null;
  headerMatches: boolean;
  rowCount: number;
  referenceRowCount: number;
  specialtyCount: number | null;
  referenceSpecialtyCount: number | null;
  departmentCount: number | null;
  referenceDepartmentCount: number | null;
  changedCellsCount: number;
  changedRows: Array<{
    rowNumber: number;
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  spreadsheetErrorsCount: number;
  spreadsheetErrors: Array<{
    rowNumber: number;
    header: string;
    value: string;
  }>;
  warnings: string[];
};

type ApiPayload = {
  action?: "preview" | "apply";
  previews?: CsvPreview[];
  result?: Record<string, unknown>;
  error?: string;
};

function kindLabel(kind: "spec" | "dept") {
  return kind === "spec" ? "MASTER_Spec.csv" : "MASTER_Dept.csv";
}

function PreviewCard({ preview }: { preview: CsvPreview }) {
  const entityLabel = preview.kind === "spec" ? "תחומי התמחות" : "מחלקות";
  const entityCount = preview.kind === "spec" ? preview.specialtyCount : preview.departmentCount;
  const referenceEntityCount =
    preview.kind === "spec" ? preview.referenceSpecialtyCount : preview.referenceDepartmentCount;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-ink">{kindLabel(preview.kind)}</p>
          <p className="text-xs font-bold text-slate-500">{preview.fileName}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            preview.headerMatches ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {preview.headerMatches ? "כותרות תקינות" : "כותרות לא תואמות"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold text-slate-500">שורות</p>
          <p className="font-black text-ink">{preview.rowCount} / {preview.referenceRowCount}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold text-slate-500">{entityLabel}</p>
          <p className="font-black text-ink">{entityCount ?? 0} / {referenceEntityCount ?? 0}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold text-slate-500">תאים שהשתנו</p>
          <p className="font-black text-ink">{preview.changedCellsCount}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs font-bold text-slate-500">שגיאות גיליון</p>
          <p className="font-black text-ink">{preview.spreadsheetErrorsCount}</p>
        </div>
      </div>

      {preview.warnings.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          {preview.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {preview.spreadsheetErrors.length > 0 ? (
        <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-black text-slate-700">
            ערכי שגיאה ראשונים שיטופלו כחסר
          </summary>
          <ul className="mt-2 max-h-40 overflow-auto text-xs">
            {preview.spreadsheetErrors.map((item) => (
              <li key={`${item.rowNumber}-${item.header}-${item.value}`}>
                שורה {item.rowNumber}: {item.header} = {item.value}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {preview.changedRows.length > 0 ? (
        <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-black text-slate-700">
            שינויים ראשונים בתאים
          </summary>
          <div className="mt-2 max-h-56 overflow-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 text-right">שורה</th>
                  <th className="py-1 text-right">שדה</th>
                  <th className="py-1 text-right">ישן</th>
                  <th className="py-1 text-right">חדש</th>
                </tr>
              </thead>
              <tbody>
                {preview.changedRows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.field}-${row.newValue}`} className="border-t border-slate-100">
                    <td className="py-1 align-top">{row.rowNumber}</td>
                    <td className="py-1 align-top font-bold">{row.field}</td>
                    <td className="py-1 align-top text-slate-500">{row.oldValue || "-"}</td>
                    <td className="py-1 align-top text-ink">{row.newValue || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function MasterCsvUploadPanel() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitForm(form: HTMLFormElement, action: "preview" | "apply") {
    const formData = new FormData(form);
    formData.set("action", action);
    setIsSubmitting(true);
    setPayload(null);

    try {
      const response = await fetch("/api/admin/master-csv", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as ApiPayload;
      setPayload(data);
    } catch {
      setPayload({ error: "הפעולה נכשלה. נסו שוב." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm(event.currentTarget, "preview");
  }

  const canApply = Boolean(payload?.previews?.length && payload.previews.every((preview) => preview.headerMatches));

  return (
    <form
      className="space-y-5 rounded-[1.5rem] border border-brand-100 bg-white p-5 shadow-sm"
      onSubmit={submit}
    >
      <div>
        <h2 className="text-xl font-black text-ink">העלאת קבצי MASTER</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          מעלים קובץ אחד או שניים, מקבלים תצוגת בדיקה, ורק לאחר אישור מפעילים את הייבוא.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <span className="text-sm font-black text-ink">MASTER_Spec.csv</span>
          <input name="specFile" type="file" accept=".csv,text/csv" className="mt-3 block w-full text-sm" />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <span className="text-sm font-black text-ink">MASTER_Dept.csv</span>
          <input name="deptFile" type="file" accept=".csv,text/csv" className="mt-3 block w-full text-sm" />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          בדיקת קובץ
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting || !canApply}
          onClick={(event) => {
            if (event.currentTarget.form) {
              void submitForm(event.currentTarget.form, "apply");
            }
          }}
        >
          Apply import
        </Button>
      </div>

      {payload?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {payload.error}
        </div>
      ) : null}

      {payload?.previews?.length ? (
        <div className="space-y-4">
          {payload.previews.map((preview) => (
            <PreviewCard key={preview.kind} preview={preview} />
          ))}
        </div>
      ) : null}

      {payload?.action === "apply" && payload.result ? (
        <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-left text-xs text-slate-100" dir="ltr">
          {JSON.stringify(payload.result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
