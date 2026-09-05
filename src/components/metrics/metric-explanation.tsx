"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  findMetricExplanationOverride,
  isMetricExplanationKey,
  metricExplanationRegistry,
  metricExplanationScopeLabels,
  metricExplanationSourceLabels,
  resolveMetricExplanation,
  type MetricExplanationContext,
  type MetricExplanationKey,
  type MetricExplanationOverrideRecord,
  type MetricExplanationScope
} from "@/lib/metric-explanations";

type MetricExplanationProviderValue = {
  context: MetricExplanationContext;
  overrides: MetricExplanationOverrideRecord[];
  isAdmin: boolean;
  replaceOverride: (override: MetricExplanationOverrideRecord) => void;
  removeOverride: (metricKey: MetricExplanationKey, scopeType: MetricExplanationScope) => void;
};

const MetricExplanationContextValue = createContext<MetricExplanationProviderValue | null>(null);

function useMetricExplanationProvider() {
  const value = useContext(MetricExplanationContextValue);
  if (!value) {
    throw new Error("MetricExplanationInfo must be rendered inside MetricExplanationProvider.");
  }
  return value;
}

export function MetricExplanationProvider({
  context,
  overrides,
  isAdmin,
  children
}: {
  context: MetricExplanationContext;
  overrides: MetricExplanationOverrideRecord[];
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [localOverrides, setLocalOverrides] = useState(overrides);

  useEffect(() => {
    setLocalOverrides(overrides);
  }, [overrides]);

  const value = useMemo<MetricExplanationProviderValue>(() => ({
    context,
    overrides: localOverrides,
    isAdmin,
    replaceOverride(override) {
      setLocalOverrides((current) => [
        ...current.filter(
          (item) =>
            !(
              item.metricKey === override.metricKey &&
              item.scopeType === override.scopeType &&
              item.scopeKey === override.scopeKey
            )
        ),
        override
      ]);
    },
    removeOverride(metricKey, scopeType) {
      setLocalOverrides((current) =>
        current.filter((item) => {
          if (item.metricKey !== metricKey || item.scopeType !== scopeType) return true;
          if (scopeType === "GLOBAL") return item.scopeKey !== "GLOBAL";
          if (scopeType === "SPECIALTY") return item.specialtyId !== context.specialtyId;
          return item.departmentId !== context.departmentId;
        })
      );
    }
  }), [context, isAdmin, localOverrides]);

  return (
    <MetricExplanationContextValue.Provider value={value}>
      {children}
    </MetricExplanationContextValue.Provider>
  );
}

function availableScopes(context: MetricExplanationContext): MetricExplanationScope[] {
  const scopes: MetricExplanationScope[] = ["GLOBAL"];
  if (context.specialtyId) scopes.push("SPECIALTY");
  if (context.departmentId) scopes.push("DEPARTMENT");
  return scopes;
}

function mostSpecificScope(context: MetricExplanationContext): MetricExplanationScope {
  if (context.departmentId) return "DEPARTMENT";
  if (context.specialtyId) return "SPECIALTY";
  return "GLOBAL";
}

function requestTarget(scopeType: MetricExplanationScope, context: MetricExplanationContext) {
  if (scopeType === "GLOBAL") {
    return { specialtyId: null, departmentId: null };
  }
  if (scopeType === "SPECIALTY") {
    return { specialtyId: context.specialtyId ?? null, departmentId: null };
  }
  return {
    specialtyId: context.specialtyId ?? null,
    departmentId: context.departmentId ?? null
  };
}

function MetricExplanationEditor({
  metricKey,
  metricLabel,
  defaultText,
  open,
  onClose
}: {
  metricKey: MetricExplanationKey;
  metricLabel: string;
  defaultText?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const provider = useMetricExplanationProvider();
  const router = useRouter();
  const [scopeType, setScopeType] = useState<MetricExplanationScope>("GLOBAL");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resolution = resolveMetricExplanation(
    metricKey,
    provider.context,
    provider.overrides,
    defaultText
  );
  const selectedOverride = findMetricExplanationOverride(
    metricKey,
    scopeType,
    provider.context,
    provider.overrides
  );
  const scopes = availableScopes(provider.context);

  function selectScope(nextScope: MetricExplanationScope) {
    const nextOverride = findMetricExplanationOverride(
      metricKey,
      nextScope,
      provider.context,
      provider.overrides
    );
    setScopeType(nextScope);
    setDraft(nextOverride?.text ?? resolution.text);
    setError(null);
    setMessage(null);
  }

  useEffect(() => {
    if (!open) return;
    const initialScope = mostSpecificScope(provider.context);
    const initialOverride = findMetricExplanationOverride(
      metricKey,
      initialScope,
      provider.context,
      provider.overrides
    );
    setScopeType(initialScope);
    setDraft(initialOverride?.text ?? resolution.text);
    setError(null);
    setMessage(null);
  }, [open, metricKey, provider.context, provider.overrides, resolution.text]);

  async function save() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/metric-explanations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metricKey,
        scopeType,
        ...requestTarget(scopeType, provider.context),
        text: draft
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok || !payload.override) {
      setError(payload.error ?? "שמירת ההסבר נכשלה.");
      return;
    }

    provider.replaceOverride(payload.override as MetricExplanationOverrideRecord);
    setMessage("ההסבר נשמר.");
    router.refresh();
  }

  async function resetOverride() {
    if (!selectedOverride) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/metric-explanations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metricKey,
        scopeType,
        ...requestTarget(scopeType, provider.context)
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "איפוס ההסבר נכשל.");
      return;
    }

    provider.removeOverride(metricKey, scopeType);
    setMessage("ההתאמה נמחקה. ההסבר חזר לרמה הפחות ספציפית.");
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="עריכת הסבר למדד"
      description="הטקסט נשמר כהתאמה. ברירת המחדל בקוד אינה נמחקת."
      className="max-w-2xl"
    >
      <div dir="rtl" className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-ink">{metricLabel}</p>
          <p className="mt-1 font-mono text-xs text-slate-500" dir="ltr">{metricKey}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">הסבר אפקטיבי נוכחי</p>
          <p className="mt-1 text-sm leading-7 text-slate-700">{resolution.text}</p>
          <p className="mt-2 text-xs font-black text-brand-800">
            מקור: {metricExplanationSourceLabels[resolution.source]}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-ink">היקף השינוי</span>
          <select
            value={scopeType}
            onChange={(event) => selectScope(event.target.value as MetricExplanationScope)}
            className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-sm font-bold text-ink"
          >
            {scopes.map((scope) => (
              <option key={scope} value={scope}>{metricExplanationScopeLabels[scope]}</option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
          השמירה תחול על: {metricExplanationScopeLabels[scopeType]}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-ink">הסבר</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={7}
            maxLength={4000}
            className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm leading-7 text-ink"
          />
        </label>

        {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={save} disabled={isSaving || !draft.trim()}>
            {isSaving ? "שומר..." : selectedOverride ? "עדכון ההתאמה" : "שמירת התאמה"}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={resetOverride}
            disabled={isSaving || !selectedOverride}
          >
            מחיקה / איפוס ברמה שנבחרה
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function MetricExplanationInfo({
  metricKey,
  metricLabel,
  fallbackText,
  sourceLabel
}: {
  metricKey?: string | null;
  metricLabel: string;
  fallbackText?: string | null;
  sourceLabel: string;
}) {
  const provider = useContext(MetricExplanationContextValue);
  const supportedKey = isMetricExplanationKey(metricKey) ? metricKey : null;
  const resolution = supportedKey
    ? resolveMetricExplanation(
        supportedKey,
        provider?.context ?? {},
        provider?.overrides ?? [],
        fallbackText
      )
    : null;
  const explanation = resolution?.text ?? fallbackText?.trim() ?? "";
  const lines = [explanation, `מקור נתונים: ${sourceLabel}`].filter(Boolean);
  const tooltipText = lines.join("\n");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1">
      <span
        tabIndex={0}
        title={tooltipText}
        aria-label={tooltipText}
        className="group grid h-7 w-7 cursor-help place-items-center rounded-full border border-slate-200 bg-white text-[0.72rem] font-black text-slate-500 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        i
        <span className="pointer-events-auto absolute left-0 top-9 z-20 hidden w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          <span className="space-y-1">
            {lines.map((line) => <span key={line} className="block">{line}</span>)}
          </span>
        </span>
      </span>
      {provider?.isAdmin && supportedKey ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-brand-200 bg-white text-[0.7rem] font-black text-brand-700 transition hover:bg-brand-50"
          title="עריכת הסבר"
          aria-label={`עריכת הסבר: ${metricLabel}`}
        >
          ✎
        </button>
      ) : null}
      {provider?.isAdmin && supportedKey ? (
        <MetricExplanationEditor
          metricKey={supportedKey}
          metricLabel={metricLabel || metricExplanationRegistry[supportedKey].label}
          defaultText={fallbackText}
          open={isEditing}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </span>
  );
}
