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
    pageType?: string;
    pageClassificationReasons?: string[];
    liveCrawlBlocked?: boolean;
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
      filterReason?: string | null;
    }>;
    liveSource?: {
      provider?: "playwright" | "manual" | "endpoint" | "sheba_elasticsearch";
      metadata?: Record<string, unknown>;
      responseKeys?: string[];
      dataKeys?: string[];
      statusCode?: number;
    };
    deeperCandidateUrls?: string[];
    deeperUrlsAttempted?: string[];
    externalSearchNeeded?: boolean;
    externalSearchQueries?: string[];
    externalSearchResults?: Array<{ title: string; url: string; source: string }>;
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

function fellowshipCount(results: PhysicianResult[] | undefined) {
  return (results ?? []).reduce((total, result) => total + result.detectedFellowships.length, 0);
}

function fellowshipText(result: PhysicianResult) {
  return result.detectedFellowships.length > 0
    ? result.detectedFellowships.map((item) => item.canonicalNameHe).join(", ")
    : "לא זוהה";
}

function evidenceText(result: PhysicianResult) {
  const snippets = result.detectedFellowships.flatMap((item) => item.evidenceSnippets);
  return snippets.length > 0 ? snippets.slice(0, 3).join(" | ") : "אין עדות פלושיפ בטקסט המקור";
}

function sourceLabel(result: PhysicianResult) {
  if (/^https?:\/\//i.test(result.sourceUrl)) return "Sheba source";
  return "Manual input";
}

export function ShebaEntFellowshipPanel() {
  const [departmentUrl, setDepartmentUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [debugMode, setDebugMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [payload, setPayload] = useState<CrawlPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPhysiciansFound =
    payload?.debug?.teamCardsFound ?? payload?.physiciansProcessed ?? payload?.results?.length ?? 0;
  const totalSeniorPhysicians =
    payload?.debug?.seniorPhysiciansFound ?? payload?.results?.length ?? payload?.physiciansProcessed ?? 0;
  const totalFellowshipsDetected = fellowshipCount(payload?.results);

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
        pastedHtml: pastedHtml.trim() || undefined,
        endpointUrl: endpointUrl.trim() || undefined,
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
            {" "}סריקה חיה של שיבא זמינה כרגע רק בהרצה מקומית/worker, לא בפרודקשן Vercel.
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
            URL של endpoint פנימי / JSON
          </span>
          <input
            value={endpointUrl}
            onChange={(event) => setEndpointUrl(event.target.value)}
            dir="ltr"
            placeholder="https://www.shebaonline.org/.../api/..."
            className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-left text-sm outline-none focus:border-brand-300"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-500">
            הדבק HTML מלא של עמוד שיבא
          </span>
          <textarea
            value={pastedHtml}
            onChange={(event) => setPastedHtml(event.target.value)}
            placeholder="HTML מלא של עמוד מחלקה / צוות / פרופיל"
            className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-brand-300"
            dir="ltr"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black text-slate-500">
            או הדבק טקסט ביוגרפי ידנית אם אין HTML
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
          מצב debug: הצג סיווג עמוד, מקור, HTML, Markdown וקישורים
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

      {payload?.results ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total physicians found</p>
            <p className="mt-1 text-2xl font-black text-ink">{totalPhysiciansFound}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total senior physicians</p>
            <p className="mt-1 text-2xl font-black text-ink">{totalSeniorPhysicians}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Total fellowships detected</p>
            <p className="mt-1 text-2xl font-black text-ink">{totalFellowshipsDetected}</p>
          </div>
        </div>
      ) : null}

      {payload?.debug ? (
        <div className="mt-4 rounded-2xl border border-brand-100 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone={payload.debug.liveCrawlBlocked ? "warning" : "default"}>
              סוג עמוד: {payload.debug.pageType ?? "unknown"}
            </Badge>
            {payload.debug.liveSource?.provider ? (
              <Badge tone="default">מקור: {payload.debug.liveSource.provider}</Badge>
            ) : null}
            <Badge tone="default">כרטיסי צוות: {payload.debug.teamCardsFound}</Badge>
            <Badge tone="default">רופאים שזוהו: {payload.debug.physiciansFound}</Badge>
            <Badge tone="success">בכירים: {payload.debug.seniorPhysiciansFound}</Badge>
            <Badge tone="warning">מתמחים שסוננו: {payload.debug.residentsFiltered}</Badge>
            <Badge tone="warning">לא רופאים שסוננו: {payload.debug.nonPhysiciansFiltered}</Badge>
            <Badge tone="default">קישורי פרופיל: {payload.debug.profileUrlsFound}</Badge>
          </div>
          {payload.debug.liveCrawlBlocked ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
              שיבא חסם או לא החזיר תוכן תקין. השתמש בהדבקת HTML/טקסט או הזן endpoint פנימי אם נמצא.
            </p>
          ) : null}
          {payload.debug.pageClassificationReasons?.length ? (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              <p className="font-black text-ink">Classification reasons</p>
              <ul className="mt-1 list-inside list-disc">
                {payload.debug.pageClassificationReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {payload.debug.firstEntries.length ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-[720px] w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">name</th>
                    <th className="px-3 py-2">title</th>
                    <th className="px-3 py-2">profileUrl</th>
                    <th className="px-3 py-2">filterReason</th>
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
                      <td className="px-3 py-2 text-slate-600">{entry.filterReason ?? "לא זוהה"}</td>
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
          {payload.debug.deeperCandidateUrls?.length ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">
                Deeper candidate URLs ({payload.debug.deeperCandidateUrls.length})
              </summary>
              <div className="mt-2 max-h-52 overflow-auto" dir="ltr">
                {payload.debug.deeperCandidateUrls.map((url) => (
                  <p key={url} className="break-all">
                    {url}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
          {payload.debug.deeperUrlsAttempted?.length ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">
                Deeper URLs attempted ({payload.debug.deeperUrlsAttempted.length})
              </summary>
              <div className="mt-2 max-h-52 overflow-auto" dir="ltr">
                {payload.debug.deeperUrlsAttempted.map((url) => (
                  <p key={url} className="break-all">
                    {url}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
          {payload.debug.externalSearchNeeded ? (
            <details className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-amber-950">
                External search queries ({payload.debug.externalSearchQueries?.length ?? 0})
              </summary>
              <div className="mt-2 max-h-52 overflow-auto" dir="rtl">
                {(payload.debug.externalSearchQueries ?? []).map((query) => (
                  <p key={query} className="break-all">
                    {query}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
          {payload.debug.liveSource ? (
            <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-black text-ink">Live source metadata</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-left" dir="ltr">
                {JSON.stringify(payload.debug.liveSource, null, 2)}
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
          <table className="min-w-[980px] w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3">Physician Name</th>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Fellowship(s)</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-3 py-3">Evidence</th>
                <th className="px-3 py-3">Needs External Search</th>
              </tr>
            </thead>
            <tbody>
              {payload.results.map((result) => {
                const top = bestFellowship(result);

                return (
                  <tr key={`${result.sourceUrl}-${result.physicianName ?? "unknown"}`} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3 font-black text-ink">{result.physicianName ?? "לא זוהה"}</td>
                    <td className="px-3 py-3 text-slate-700">{result.role ?? "לא זוהה"}</td>
                    <td className="px-3 py-3">
                      {/^https?:\/\//i.test(result.sourceUrl) ? (
                        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">
                          {sourceLabel(result)}
                        </a>
                      ) : (
                        <span className="font-bold text-slate-500">{sourceLabel(result)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{fellowshipText(result)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={confidenceTone(top?.confidence)}>
                        {top ? `${top.confidence} · ${top.totalScore}` : "None"}
                      </Badge>
                    </td>
                    <td className="max-w-md px-3 py-3 leading-5 text-slate-600">{evidenceText(result)}</td>
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
          לא נמצאו רופאים בכירים לעיבוד. נסה להדביק HTML מלא של עמוד שיבא, טקסט ביוגרפי או endpoint פנימי.
        </p>
      ) : null}
    </section>
  );
}
