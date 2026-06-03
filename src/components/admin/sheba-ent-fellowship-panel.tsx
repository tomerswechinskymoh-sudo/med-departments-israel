"use client";

import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DetectedFellowship = {
  fellowshipId: string;
  canonicalNameHe: string;
  canonicalNameEn: string;
  totalScore: number;
  confidence: "Very High" | "High" | "Medium" | "Low";
  evidenceSnippets: string[];
};

type PhysicianResult = {
  physicianName: string | null;
  role: string | null;
  department: string | null;
  hospital: "שיבא";
  sourceUrl: string;
  bioTextLength: number;
  residencySpecialty: string | null;
  residencyInstitution: string | null;
  residencyYears: string | null;
  fellowshipInstitution: string | null;
  fellowshipYears: string | null;
  detectedFellowships: DetectedFellowship[];
  needsExternalSearch: boolean;
  reason: string;
};

type CrawlPayload = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  stack?: string;
  startUrl?: string;
  departmentUrl?: string;
  physiciansProcessed?: number;
  results?: PhysicianResult[];
  warnings?: string[];
};

function confidenceTone(confidence?: string) {
  if (confidence === "Very High" || confidence === "High") return "success" as const;
  if (confidence === "Medium") return "warning" as const;
  return "default" as const;
}

function bestFellowship(result: PhysicianResult) {
  return result.detectedFellowships[0] ?? null;
}

export function ShebaEntFellowshipPanel() {
  const [departmentUrl, setDepartmentUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [payload, setPayload] = useState<CrawlPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCrawler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setPayload(null);

    const response = await fetch("/api/admin/fellowship-poc/sheba-ent", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        departmentUrl: departmentUrl.trim() || undefined,
        pastedText: pastedText.trim() || undefined
      })
    });
    const nextPayload: CrawlPayload = await response.json().catch(() => ({}));
    setIsLoading(false);

    if (!response.ok || nextPayload.ok === false) {
      setError(nextPayload.error ?? "סריקת אא״ג שיבא נכשלה.");
      setPayload(nextPayload);
      return;
    }

    setPayload(nextPayload);
  }

  return (
    <section className="rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-ink">זיהוי פלושיפים - אא״ג שיבא</h3>
            <Badge tone="warning">POC אדמין בלבד</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            סריקה מוגבלת לשיבא ולאא״ג בלבד. התוצאות אינן נשמרות ואינן מוצגות לציבור.
          </p>
        </div>
        {payload?.physiciansProcessed !== undefined ? (
          <Badge tone="success">{payload.physiciansProcessed} רופאים עובדו</Badge>
        ) : null}
      </div>

      <form onSubmit={runCrawler} className="mt-4 grid gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-500">
            הדבק URL של מחלקת אא״ג שיבא
          </span>
          <input
            value={departmentUrl}
            onChange={(event) => setDepartmentUrl(event.target.value)}
            dir="ltr"
            placeholder="https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/"
            className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-left text-sm outline-none focus:border-brand-300"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-500">
            או הדבק טקסט ביוגרפי ידנית אם Playwright נכשל
          </span>
          <textarea
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder="טקסט פרופיל / ביוגרפיה של רופא/ה בכיר/ה מאא״ג שיבא"
            className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-brand-300"
          />
        </label>
        <div className="flex justify-start">
          <Button type="submit" disabled={isLoading} className="min-h-12 w-full md:w-auto">
            {isLoading ? "סורק..." : "סרוק אא״ג שיבא"}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}

      {payload?.errorCode || payload?.stack ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-left text-xs leading-5 text-red-900" dir="ltr">
          {payload.errorCode ? <p className="font-black">errorCode: {payload.errorCode}</p> : null}
          {payload.stack ? <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{payload.stack}</pre> : null}
        </div>
      ) : null}

      {payload?.warnings?.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {payload.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {payload?.departmentUrl ? (
        <p className="mt-4 truncate text-xs font-semibold text-slate-500">
          מקור מחלקה:{" "}
          <a href={payload.departmentUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">
            {payload.departmentUrl}
          </a>
        </p>
      ) : null}

      {payload?.results?.length ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-brand-100 bg-white">
          <table className="min-w-[1200px] w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3">שם רופא</th>
                <th className="px-3 py-3">תפקיד</th>
                <th className="px-3 py-3">מחלקה</th>
                <th className="px-3 py-3">מקור</th>
                <th className="px-3 py-3">אורך טקסט</th>
                <th className="px-3 py-3">תחום התמחות</th>
                <th className="px-3 py-3">התמחות: שנים</th>
                <th className="px-3 py-3">התמחות: מוסד</th>
                <th className="px-3 py-3">פלושיפים שזוהו</th>
                <th className="px-3 py-3">Fellowship confidence</th>
                <th className="px-3 py-3">Fellowship institution</th>
                <th className="px-3 py-3">Fellowship years</th>
                <th className="px-3 py-3">Evidence snippets</th>
                <th className="px-3 py-3">Needs external search</th>
              </tr>
            </thead>
            <tbody>
              {payload.results.map((result) => {
                const top = bestFellowship(result);

                return (
                  <tr key={`${result.sourceUrl}-${result.physicianName ?? "unknown"}`} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3 font-black text-ink">{result.physicianName ?? "לא זוהה"}</td>
                    <td className="px-3 py-3 text-slate-700">{result.role ?? "לא זוהה"}</td>
                    <td className="px-3 py-3 text-slate-700">{result.department ?? "אא״ג"}</td>
                    <td className="px-3 py-3">
                      {/^https?:\/\//i.test(result.sourceUrl) ? (
                        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">
                          מקור
                        </a>
                      ) : (
                        <span className="font-bold text-slate-500">טקסט ידני</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-700">{result.bioTextLength}</td>
                    <td className="px-3 py-3">{result.residencySpecialty ?? "לא זוהה"}</td>
                    <td className="px-3 py-3">{result.residencyYears ?? "לא זוהה"}</td>
                    <td className="px-3 py-3">{result.residencyInstitution ?? "לא זוהה"}</td>
                    <td className="px-3 py-3">
                      {result.detectedFellowships.length > 0
                        ? result.detectedFellowships.map((item) => item.canonicalNameHe).join(", ")
                        : "לא זוהה"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={confidenceTone(top?.confidence)}>
                        {top ? `${top.confidence} · ${top.totalScore}` : "None"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">{result.fellowshipInstitution ?? "לא זוהה"}</td>
                    <td className="px-3 py-3">{result.fellowshipYears ?? "לא זוהה"}</td>
                    <td className="max-w-sm px-3 py-3 leading-5 text-slate-600">
                      {top?.evidenceSnippets.length ? top.evidenceSnippets.join(" | ") : "אין"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={result.needsExternalSearch ? "warning" : "success"}>
                        {result.needsExternalSearch ? "כן" : "לא"}
                      </Badge>
                      <p className="mt-1 leading-5 text-slate-500">{result.reason}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : payload && !payload.results?.length ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          לא נמצאו רופאים בכירים לעיבוד. נסה URL ידני של עמוד המחלקה.
        </p>
      ) : null}
    </section>
  );
}
