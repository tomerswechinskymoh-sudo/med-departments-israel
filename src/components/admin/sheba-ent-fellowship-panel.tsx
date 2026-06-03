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
  debug?: {
    teamCardsFound: number;
    physiciansFound: number;
    seniorPhysiciansFound: number;
    residentsFiltered: number;
    nonPhysiciansFiltered: number;
    profileUrlsFound: number;
    firstEntries: Array<{
      name: string | null;
      title: string | null;
      profileUrl: string | null;
    }>;
    firecrawl?: {
      metadata?: Record<string, unknown>;
      responseKeys?: string[];
      dataKeys?: string[];
      statusCode?: number;
    };
    markdownPreview?: string;
    htmlPreview?: string;
    allLinks?: Array<{ text: string; href: string }>;
    relevantLinks?: Array<{ text: string; href: string }>;
    pageSourceAssessment?: {
      teamSectionInHtml: boolean;
      teamSectionInMarkdown: boolean;
      likelyJavaScriptInjected: boolean;
      likelySeparateApiEndpoint: boolean;
      endpointCandidates: string[];
      notes: string[];
    };
  };
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
  const [debugMode, setDebugMode] = useState(false);
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
        pastedText: pastedText.trim() || undefined,
        debug: debugMode
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
            או הדבק טקסט ביוגרפי ידנית אם הסריקה החיה נכשלת
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
        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(event) => setDebugMode(event.target.checked)}
            className="h-4 w-4 rounded border-brand-200"
          />
          מצב debug: הצג Firecrawl, HTML, Markdown וקישורים
        </label>
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

      {payload?.debug ? (
        <div className="mt-4 rounded-2xl border border-brand-100 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="default">כרטיסי צוות: {payload.debug.teamCardsFound}</Badge>
            <Badge tone="default">רופאים שזוהו: {payload.debug.physiciansFound}</Badge>
            <Badge tone="success">בכירים: {payload.debug.seniorPhysiciansFound}</Badge>
            <Badge tone="warning">מתמחים שסוננו: {payload.debug.residentsFiltered}</Badge>
            <Badge tone="warning">לא רופאים שסוננו: {payload.debug.nonPhysiciansFiltered}</Badge>
            <Badge tone="default">קישורי פרופיל: {payload.debug.profileUrlsFound}</Badge>
          </div>
          {payload.debug.firstEntries.length ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-[720px] w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">name</th>
                    <th className="px-3 py-2">title</th>
                    <th className="px-3 py-2">profileUrl</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.debug.firstEntries.map((entry, index) => (
                    <tr key={`${entry.profileUrl ?? entry.name ?? "entry"}-${index}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-bold text-ink">{entry.name ?? "לא זוהה"}</td>
                      <td className="px-3 py-2 text-slate-700">{entry.title ?? "לא זוהה"}</td>
                      <td className="px-3 py-2" dir="ltr">
                        {entry.profileUrl ? (
                          <a href={entry.profileUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                            {entry.profileUrl}
                          </a>
                        ) : (
                          <span className="text-slate-500">אין</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {payload.debug.pageSourceAssessment ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              <p className="font-black text-ink">Page source assessment</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={payload.debug.pageSourceAssessment.teamSectionInHtml ? "success" : "warning"}>
                  HTML team section: {payload.debug.pageSourceAssessment.teamSectionInHtml ? "yes" : "no"}
                </Badge>
                <Badge tone={payload.debug.pageSourceAssessment.teamSectionInMarkdown ? "success" : "warning"}>
                  Markdown team section: {payload.debug.pageSourceAssessment.teamSectionInMarkdown ? "yes" : "no"}
                </Badge>
                <Badge tone={payload.debug.pageSourceAssessment.likelyJavaScriptInjected ? "warning" : "default"}>
                  JS injected: {payload.debug.pageSourceAssessment.likelyJavaScriptInjected ? "likely" : "not likely"}
                </Badge>
                <Badge tone={payload.debug.pageSourceAssessment.likelySeparateApiEndpoint ? "warning" : "default"}>
                  API endpoint: {payload.debug.pageSourceAssessment.likelySeparateApiEndpoint ? "candidate found" : "not found"}
                </Badge>
              </div>
              {payload.debug.pageSourceAssessment.notes.length ? (
                <ul className="mt-2 list-inside list-disc">
                  {payload.debug.pageSourceAssessment.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
              {payload.debug.pageSourceAssessment.endpointCandidates.length ? (
                <div className="mt-3">
                  <p className="font-bold">Endpoint candidates</p>
                  <div className="mt-1 max-h-44 overflow-auto" dir="ltr">
                    {payload.debug.pageSourceAssessment.endpointCandidates.map((url) => (
                      <p key={url} className="break-all">
                        {url}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {payload.debug.firecrawl ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">Raw Firecrawl metadata</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-left" dir="ltr">
                {JSON.stringify(payload.debug.firecrawl, null, 2)}
              </pre>
            </details>
          ) : null}
          {payload.debug.relevantLinks?.length ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">
                Relevant links ({payload.debug.relevantLinks.length})
              </summary>
              <div className="mt-2 max-h-64 overflow-auto" dir="ltr">
                {payload.debug.relevantLinks.map((link, index) => (
                  <p key={`${link.href}-${index}`} className="break-all">
                    {link.text ? `${link.text} — ` : ""}
                    {link.href}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
          {payload.debug.allLinks?.length ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">
                All links ({payload.debug.allLinks.length})
              </summary>
              <div className="mt-2 max-h-64 overflow-auto" dir="ltr">
                {payload.debug.allLinks.map((link, index) => (
                  <p key={`${link.href}-${link.text}-${index}`} className="break-all">
                    {link.text ? `${link.text} — ` : ""}
                    {link.href}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
          {payload.debug.markdownPreview ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">First 5000 chars of markdown</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-left" dir="ltr">
                {payload.debug.markdownPreview}
              </pre>
            </details>
          ) : null}
          {payload.debug.htmlPreview ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">First 5000 chars of HTML</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-left" dir="ltr">
                {payload.debug.htmlPreview}
              </pre>
            </details>
          ) : null}
        </div>
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
