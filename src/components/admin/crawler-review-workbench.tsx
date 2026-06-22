"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ReviewEntityType = "canonicalDoctor" | "doctorDepartmentLink" | "reviewIssue";
type SourceSheet = "Canonical Doctors" | "Department Links" | "Review Needed";
type ManualDecision =
  | ""
  | "approve"
  | "reject"
  | "needs_check"
  | "duplicate"
  | "wrong_department"
  | "out_of_scope"
  | "keep_roster_only";

type ReviewRow = Record<string, string | boolean | number | undefined> & {
  reviewEntityId: string;
  reviewEntityType: ReviewEntityType;
  hospitalSlug: string;
  fullName: string;
  manualDecision?: string;
  manualNotes?: string;
};

type Summary = {
  hospitalSlug: string;
  hospitalName: string;
  outputUsability: string;
  crawlReadiness: string;
  mappingReadiness: string;
  canonicalDoctorsCount: number;
  departmentLinksCount: number;
  reviewNeededCount: number;
  sourceUrlMatchCount: number;
  reviewNeededLinkCount: number;
  reviewedCount: number;
  totalReviewableCount: number;
  warningBadges: Record<string, number>;
  cautionFlags: string[];
};

const TAB_CONFIG: Record<string, { label: string; sourceSheet: SourceSheet; sourceType: ReviewEntityType }> = {
  doctors: { label: "Doctors", sourceSheet: "Canonical Doctors", sourceType: "canonicalDoctor" },
  links: { label: "Department Links", sourceSheet: "Department Links", sourceType: "doctorDepartmentLink" },
  issues: { label: "Review Needed", sourceSheet: "Review Needed", sourceType: "reviewIssue" }
};

const ACTIONS: Record<string, ManualDecision[]> = {
  doctors: ["approve", "reject", "needs_check", "duplicate", "out_of_scope", "keep_roster_only"],
  links: ["approve", "wrong_department", "needs_check", "reject", "keep_roster_only"],
  issues: ["approve", "reject", "needs_check", "duplicate", "wrong_department", "out_of_scope", "keep_roster_only"]
};

const DECISION_LABELS: Record<ManualDecision, string> = {
  "": "No decision",
  approve: "Approve",
  reject: "Reject",
  needs_check: "Needs check",
  duplicate: "Duplicate",
  wrong_department: "Wrong department",
  out_of_scope: "Out of scope",
  keep_roster_only: "Keep roster only"
};

function text(row: ReviewRow, key: string) {
  return String(row[key] ?? "");
}

function hasToken(row: ReviewRow, token: string) {
  return [row.cautionFlags, row.issueType, row.matchConfidence, row.ambiguityReason]
    .map((value) => String(value ?? ""))
    .some((value) => value.includes(token));
}

function rowSearchText(row: ReviewRow) {
  return [
    row.fullName,
    row.roleOrTitle,
    row.departmentName,
    row.specialty,
    row.matchedMasterDepartmentName,
    row.matchedMasterSpecialty,
    row.issueType,
    row.cautionFlags
  ].join(" ");
}

function sourceLabel(tab: string) {
  return TAB_CONFIG[tab] ?? TAB_CONFIG.doctors;
}

export function CrawlerReviewWorkbench({
  summary,
  doctors,
  departmentLinks,
  reviewNeeded
}: {
  summary: Summary;
  doctors: ReviewRow[];
  departmentLinks: ReviewRow[];
  reviewNeeded: ReviewRow[];
}) {
  const [tab, setTab] = useState("doctors");
  const [filter, setFilter] = useState("unreviewed");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Record<string, { manualDecision: ManualDecision; manualNotes: string }>>({});
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const rows = tab === "links" ? departmentLinks : tab === "issues" ? reviewNeeded : doctors;
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const decision = pending[row.reviewEntityId]?.manualDecision ?? (row.manualDecision as ManualDecision | undefined) ?? "";
      if (filter === "unreviewed" && decision) return false;
      if (filter === "warnings" && !text(row, "needsManualReview") && !text(row, "cautionFlags") && !text(row, "issueType")) return false;
      if (filter === "possibleOutOfScopeRole" && !hasToken(row, "possibleOutOfScopeRole")) return false;
      if (filter === "suspiciousName" && !hasToken(row, "suspiciousName")) return false;
      if (filter === "mappingReviewNeeded" && !hasToken(row, "mappingReviewNeeded") && !hasToken(row, "matchConfidenceReviewNeeded")) return false;
      if (filter === "approved" && decision !== "approve") return false;
      if (filter === "rejected" && decision !== "reject") return false;
      if (filter === "needs_check" && decision !== "needs_check") return false;
      if (normalizedQuery && !rowSearchText(row).toLowerCase().includes(normalizedQuery)) return false;
      return true;
    });
  }, [filter, pending, query, rows]);

  function updateRow(row: ReviewRow, field: "manualDecision" | "manualNotes", value: string) {
    setPending((current) => ({
      ...current,
      [row.reviewEntityId]: {
        manualDecision: (field === "manualDecision" ? value : current[row.reviewEntityId]?.manualDecision ?? row.manualDecision ?? "") as ManualDecision,
        manualNotes: field === "manualNotes" ? value : current[row.reviewEntityId]?.manualNotes ?? String(row.manualNotes ?? "")
      }
    }));
  }

  async function saveRows(rowsToSave: ReviewRow[]) {
    const config = sourceLabel(tab);
    const decisions = rowsToSave.map((row) => ({
      reviewEntityId: row.reviewEntityId,
      reviewEntityType: row.reviewEntityType,
      hospitalSlug: row.hospitalSlug,
      manualDecision: pending[row.reviewEntityId]?.manualDecision ?? row.manualDecision ?? "",
      manualNotes: pending[row.reviewEntityId]?.manualNotes ?? row.manualNotes ?? "",
      sourceSheet: config.sourceSheet,
      sourceType: config.sourceType
    }));

    setStatus("Saving...");
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/admin/crawler-review/decisions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decisions })
        });
        const payload = await response.json();
        if (!response.ok) {
          setStatus(payload.error ?? "Save failed.");
          return;
        }
        setPending((current) => {
          const next = { ...current };
          for (const row of rowsToSave) delete next[row.reviewEntityId];
          return next;
        });
        setStatus(`Saved ${decisions.length}. Validation errors: ${payload.validation?.errorCount ?? 0}.`);
      })();
    });
  }

  function bulkMark(kind: "clean" | "rosterOnly" | "outOfScope") {
    const targetRows =
      kind === "clean"
        ? doctors.filter((row) => !text(row, "cautionFlags") && !row.manualDecision)
        : kind === "rosterOnly"
          ? reviewNeeded.filter((row) => hasToken(row, "hospitalRosterOnly"))
          : [...doctors, ...reviewNeeded].filter((row) => hasToken(row, "possibleOutOfScopeRole"));
    const decision: ManualDecision = kind === "clean" ? "approve" : kind === "rosterOnly" ? "keep_roster_only" : "needs_check";
    if (!targetRows.length) {
      setStatus("No matching rows for bulk action.");
      return;
    }
    if (!window.confirm(`Apply ${DECISION_LABELS[decision]} to ${targetRows.length} rows?`)) return;
    setPending((current) => {
      const next = { ...current };
      for (const row of targetRows) next[row.reviewEntityId] = { manualDecision: decision, manualNotes: String(row.manualNotes ?? "") };
      return next;
    });
  }

  const progress = summary.totalReviewableCount
    ? Math.round((summary.reviewedCount / summary.totalReviewableCount) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <Card className="border-amber-200 bg-amber-50/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">Local review artifact only</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Decisions are saved to <code>data/crawler/hospitals/review-exports/admin-review-decisions.json</code>.
              This does not write Prisma data and does not publish doctors.
            </p>
          </div>
          <Badge tone="warning">{summary.reviewedCount}/{summary.totalReviewableCount} reviewed · {progress}%</Badge>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><p className="text-xs font-bold text-slate-500">Doctors</p><p className="text-2xl font-black text-ink">{summary.canonicalDoctorsCount}</p></Card>
        <Card><p className="text-xs font-bold text-slate-500">Links</p><p className="text-2xl font-black text-ink">{summary.departmentLinksCount}</p></Card>
        <Card><p className="text-xs font-bold text-slate-500">Review Needed</p><p className="text-2xl font-black text-ink">{summary.reviewNeededCount}</p></Card>
        <Card><p className="text-xs font-bold text-slate-500">Source URL Match</p><p className="text-2xl font-black text-ink">{summary.sourceUrlMatchCount}</p></Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TAB_CONFIG).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn("rounded-full px-4 py-2 text-sm font-black", tab === key ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-900")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search doctor, department, issue..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <option value="unreviewed">Only unreviewed</option>
            <option value="warnings">Only warnings</option>
            <option value="possibleOutOfScopeRole">Possible out-of-scope role</option>
            <option value="suspiciousName">Suspicious name</option>
            <option value="mappingReviewNeeded">Mapping review needed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_check">Needs check</option>
            <option value="all">All rows</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => bulkMark("clean")}>Mark all clean doctors approve</Button>
          <Button type="button" variant="secondary" onClick={() => bulkMark("rosterOnly")}>Mark hospitalRosterOnly keep_roster_only</Button>
          <Button type="button" variant="secondary" onClick={() => bulkMark("outOfScope")}>Mark out-of-scope needs_check</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-black text-ink">{TAB_CONFIG[tab].label}</p>
            <p className="text-sm text-slate-600">{filteredRows.length} visible rows</p>
          </div>
          {status ? <Badge tone={status.includes("failed") || status.includes("error") ? "danger" : "success"}>{status}</Badge> : null}
        </div>

        <div className="space-y-3">
          {filteredRows.slice(0, 250).map((row) => {
            const decision = pending[row.reviewEntityId]?.manualDecision ?? (row.manualDecision as ManualDecision | undefined) ?? "";
            const notes = pending[row.reviewEntityId]?.manualNotes ?? String(row.manualNotes ?? "");
            const actions = ACTIONS[tab];
            return (
              <div key={row.reviewEntityId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr_1.1fr]">
                  <div>
                    <p className="font-black text-ink">{row.fullName || "No name"}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{text(row, "roleOrTitle") || text(row, "issueType") || text(row, "matchConfidence")}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{row.reviewEntityId}</p>
                    {text(row, "profileUrl") ? <a href={text(row, "profileUrl")} target="_blank" className="mt-1 inline-flex text-xs font-bold text-brand-700">Profile</a> : null}
                  </div>
                  <div className="text-sm leading-6 text-slate-700">
                    <p><span className="font-bold">Department:</span> {text(row, "departmentName") || text(row, "matchedMasterDepartmentName") || "—"}</p>
                    <p><span className="font-bold">Specialty:</span> {text(row, "specialty") || text(row, "matchedMasterSpecialty") || "—"}</p>
                    <p><span className="font-bold">Flags:</span> {text(row, "cautionFlags") || text(row, "issueType") || "—"}</p>
                    {text(row, "ambiguityReason") ? <p><span className="font-bold">Ambiguity:</span> {text(row, "ambiguityReason")}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <select value={decision} onChange={(event) => updateRow(row, "manualDecision", event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">No decision</option>
                      {actions.map((action) => <option key={action} value={action}>{DECISION_LABELS[action]}</option>)}
                    </select>
                    <textarea
                      value={notes}
                      onChange={(event) => updateRow(row, "manualNotes", event.target.value)}
                      placeholder="Manual notes"
                      className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <Button type="button" disabled={isPending} onClick={() => saveRows([row])} className="w-full">Save row</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredRows.length > 250 ? <p className="mt-4 text-sm text-slate-500">Showing first 250 rows. Use filters/search to narrow.</p> : null}
      </Card>

      <Card>
        <p className="font-black text-ink">Validate decisions</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Run <code>npm run validate:crawler-review-xlsx</code> after saving decisions. The validator also checks
          <code> admin-review-decisions.json</code> for duplicate IDs and contradiction rules.
        </p>
      </Card>
    </div>
  );
}
