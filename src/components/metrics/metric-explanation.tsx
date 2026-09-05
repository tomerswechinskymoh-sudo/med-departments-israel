"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  findMetricExplanationOverride,
  isMetricExplanationKey,
  isValidMetricSourceUrl,
  metricExplanationScopeLabels,
  metricExplanationSourceLabels,
  metricRichTextToPlainText,
  parseMetricRichText,
  resolveMetricContent,
  toggleMetricBoldMarkup,
  type MetricContentDefaults,
  type MetricContentField,
  type MetricExplanationContext,
  type MetricExplanationKey,
  type MetricExplanationOverrideRecord,
  type MetricExplanationScope,
  type ResolvedMetricContent
} from "@/lib/metric-explanations";

type MetricExplanationProviderValue = {
  context: MetricExplanationContext;
  overrides: MetricExplanationOverrideRecord[];
  isAdmin: boolean;
  replaceOverride: (override: MetricExplanationOverrideRecord) => void;
  removeOverride: (metricKey: MetricExplanationKey, scopeType: MetricExplanationScope) => void;
};

type ContentDraft = Record<MetricContentField, string>;
type ContentFieldState = Record<MetricContentField, boolean>;

const contentFields: MetricContentField[] = ["title", "explanation", "sourceLabel", "sourceUrl"];
const emptyDraft: ContentDraft = { title: "", explanation: "", sourceLabel: "", sourceUrl: "" };
const emptyFieldState: ContentFieldState = {
  title: false,
  explanation: false,
  sourceLabel: false,
  sourceUrl: false
};

const MetricExplanationContextValue = createContext<MetricExplanationProviderValue | null>(null);

function useMetricExplanationProvider() {
  const value = useContext(MetricExplanationContextValue);
  if (!value) {
    throw new Error("Metric content must be rendered inside MetricExplanationProvider.");
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

function isOverrideAtScope(
  override: MetricExplanationOverrideRecord,
  metricKey: MetricExplanationKey,
  scopeType: MetricExplanationScope,
  context: MetricExplanationContext
) {
  if (override.metricKey !== metricKey || override.scopeType !== scopeType) return false;
  if (scopeType === "GLOBAL") return override.scopeKey === "GLOBAL";
  if (scopeType === "SPECIALTY") return override.specialtyId === context.specialtyId;
  return override.departmentId === context.departmentId;
}

function ownFieldValue(
  override: MetricExplanationOverrideRecord | null,
  field: MetricContentField
) {
  if (!override) return null;
  if (field === "explanation") return override.explanation ?? override.text;
  return override[field];
}

function MetricRichText({ value }: { value: string }) {
  return (
    <>
      {parseMetricRichText(value).map((segment, index) =>
        segment.bold
          ? <strong key={`${index}-${segment.text}`}>{segment.text}</strong>
          : <span key={`${index}-${segment.text}`}>{segment.text}</span>
      )}
    </>
  );
}

function MetricSource({ label, url }: { label: string | null; url: string | null }) {
  if (!label) return null;
  const safeUrl = url?.trim() && isValidMetricSourceUrl(url) ? url.trim() : null;

  return safeUrl ? (
    <a
      href={safeUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="font-black text-brand-700 underline decoration-brand-200 underline-offset-2"
    >
      {label}
    </a>
  ) : <>{label}</>;
}

function BoldContentField({
  value,
  onChange,
  disabled,
  multiline,
  maxLength
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  multiline?: boolean;
  maxLength: number;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  function toggleBold() {
    const input = inputRef.current;
    if (!input || disabled) return;
    const result = toggleMetricBoldMarkup(
      value,
      input.selectionStart ?? value.length,
      input.selectionEnd ?? value.length
    );
    onChange(result.value);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  const className = `w-full rounded-2xl border px-4 py-3 text-sm text-ink disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
    disabled ? "border-slate-200" : "border-brand-200 bg-white"
  }`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleBold}
        disabled={disabled}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white font-black text-ink transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
        title="מודגש"
        aria-label="הדגשה"
      >
        B
      </button>
      {multiline ? (
        <textarea
          ref={inputRef as RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={7}
          maxLength={maxLength}
          className={`${className} leading-7`}
        />
      ) : (
        <input
          ref={inputRef as RefObject<HTMLInputElement>}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          className={className}
        />
      )}
    </div>
  );
}

function FieldHeader({
  label,
  field,
  enabled,
  inheritedResolution,
  onToggle
}: {
  label: string;
  field: MetricContentField;
  enabled: boolean;
  inheritedResolution: ResolvedMetricContent;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div>
        <span className="block text-sm font-black text-ink">{label}</span>
        <span className="text-[0.68rem] font-bold text-slate-500">
          {enabled
            ? "מותאם ברמה שנבחרה"
            : `בירושה מ־${metricExplanationSourceLabels[inheritedResolution.provenance[field].source]}`}
        </span>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-black text-brand-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-4 w-4 accent-brand-700"
        />
        התאמה ברמה זו
      </label>
    </div>
  );
}

function MetricExplanationEditor({
  metricKey,
  defaults,
  open,
  onClose
}: {
  metricKey: MetricExplanationKey;
  defaults: MetricContentDefaults;
  open: boolean;
  onClose: () => void;
}) {
  const provider = useMetricExplanationProvider();
  const router = useRouter();
  const [scopeType, setScopeType] = useState<MetricExplanationScope>("GLOBAL");
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [enabledFields, setEnabledFields] = useState<ContentFieldState>(emptyFieldState);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resolution = resolveMetricContent(metricKey, provider.context, provider.overrides, defaults);
  const selectedOverride = findMetricExplanationOverride(
    metricKey,
    scopeType,
    provider.context,
    provider.overrides
  );
  const inheritedResolution = resolveMetricContent(
    metricKey,
    provider.context,
    provider.overrides.filter(
      (override) => !isOverrideAtScope(override, metricKey, scopeType, provider.context)
    ),
    defaults
  );
  const scopes = availableScopes(provider.context);

  function loadScope(nextScope: MetricExplanationScope) {
    const nextOverride = findMetricExplanationOverride(
      metricKey,
      nextScope,
      provider.context,
      provider.overrides
    );
    const inherited = resolveMetricContent(
      metricKey,
      provider.context,
      provider.overrides.filter(
        (override) => !isOverrideAtScope(override, metricKey, nextScope, provider.context)
      ),
      defaults
    );
    const nextEnabled = { ...emptyFieldState };
    const nextDraft = { ...emptyDraft };

    for (const field of contentFields) {
      const ownValue = ownFieldValue(nextOverride, field);
      nextEnabled[field] = ownValue !== null;
      nextDraft[field] = ownValue ?? inherited[field] ?? "";
    }

    setScopeType(nextScope);
    setEnabledFields(nextEnabled);
    setDraft(nextDraft);
    setError(null);
    setMessage(null);
  }

  useEffect(() => {
    if (!open) return;
    loadScope(mostSpecificScope(provider.context));
    // The editor intentionally reloads only when opened or its metric changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, metricKey]);

  function updateDraft(field: MetricContentField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field === "sourceUrl" && value.trim()) {
      setEnabledFields((current) => ({ ...current, sourceLabel: true }));
    }
  }

  function toggleField(field: MetricContentField, enabled: boolean) {
    setEnabledFields((current) => ({ ...current, [field]: enabled }));
    if (!enabled) {
      setDraft((current) => ({ ...current, [field]: inheritedResolution[field] ?? "" }));
    }
  }

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
        title: enabledFields.title ? draft.title : null,
        explanation: enabledFields.explanation ? draft.explanation : null,
        sourceLabel: enabledFields.sourceLabel ? draft.sourceLabel : null,
        sourceUrl: enabledFields.sourceUrl ? draft.sourceUrl : null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "שמירת תוכן המדד נכשלה.");
      return;
    }

    if (payload.override) {
      provider.replaceOverride(payload.override as MetricExplanationOverrideRecord);
    } else {
      provider.removeOverride(metricKey, scopeType);
    }
    setMessage("תוכן המדד נשמר.");
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
      setError(payload.error ?? "איפוס תוכן המדד נכשל.");
      return;
    }

    provider.removeOverride(metricKey, scopeType);
    setEnabledFields({ ...emptyFieldState });
    setDraft({
      title: inheritedResolution.title,
      explanation: inheritedResolution.explanation,
      sourceLabel: inheritedResolution.sourceLabel ?? "",
      sourceUrl: inheritedResolution.sourceUrl ?? ""
    });
    setMessage("ההתאמה נמחקה. כל השדות חזרו לרמה הפחות ספציפית.");
    router.refresh();
  }

  const hasInvalidField =
    (enabledFields.title && !draft.title.trim()) ||
    (enabledFields.explanation && !draft.explanation.trim()) ||
    (enabledFields.sourceLabel && !draft.sourceLabel.trim()) ||
    (enabledFields.sourceUrl && Boolean(draft.sourceUrl.trim()) && !isValidMetricSourceUrl(draft.sourceUrl)) ||
    (enabledFields.sourceUrl && Boolean(draft.sourceUrl.trim()) && !draft.sourceLabel.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="עריכת תוכן מדד"
      description="כל שדה נשמר בנפרד. שדה שאינו מותאם יורש את הערך מהרמה הפחות ספציפית."
      className="max-w-3xl"
    >
      <div dir="rtl" className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-ink"><MetricRichText value={resolution.title} /></p>
          <p className="mt-1 font-mono text-xs text-slate-500" dir="ltr">{metricKey}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">תוכן אפקטיבי נוכחי</p>
          <p className="mt-1 text-sm leading-7 text-slate-700">
            <MetricRichText value={resolution.explanation} />
          </p>
          {resolution.sourceLabel ? (
            <p className="mt-2 text-xs font-bold text-slate-600">
              מקור: <MetricSource label={resolution.sourceLabel} url={resolution.sourceUrl} />
            </p>
          ) : null}
          <div className="mt-3 grid gap-1 text-[0.68rem] font-bold text-brand-800 sm:grid-cols-4">
            <div>כותרת: {metricExplanationSourceLabels[resolution.provenance.title.source]}</div>
            <div>הסבר: {metricExplanationSourceLabels[resolution.provenance.explanation.source]}</div>
            <div>שם מקור: {metricExplanationSourceLabels[resolution.provenance.sourceLabel.source]}</div>
            <div>קישור מקור: {metricExplanationSourceLabels[resolution.provenance.sourceUrl.source]}</div>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-ink">היקף השינוי</span>
          <select
            value={scopeType}
            onChange={(event) => loadScope(event.target.value as MetricExplanationScope)}
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

        <section className="rounded-2xl border border-slate-200 p-4">
          <FieldHeader
            label="כותרת"
            field="title"
            enabled={enabledFields.title}
            inheritedResolution={inheritedResolution}
            onToggle={(enabled) => toggleField("title", enabled)}
          />
          <BoldContentField
            value={draft.title}
            onChange={(value) => updateDraft("title", value)}
            disabled={!enabledFields.title}
            maxLength={300}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 p-4">
          <FieldHeader
            label="הסבר"
            field="explanation"
            enabled={enabledFields.explanation}
            inheritedResolution={inheritedResolution}
            onToggle={(enabled) => toggleField("explanation", enabled)}
          />
          <BoldContentField
            value={draft.explanation}
            onChange={(value) => updateDraft("explanation", value)}
            disabled={!enabledFields.explanation}
            multiline
            maxLength={4000}
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <FieldHeader
              label="שם המקור"
              field="sourceLabel"
              enabled={enabledFields.sourceLabel}
              inheritedResolution={inheritedResolution}
              onToggle={(enabled) => toggleField("sourceLabel", enabled)}
            />
            <input
              value={draft.sourceLabel}
              onChange={(event) => updateDraft("sourceLabel", event.target.value)}
              disabled={!enabledFields.sourceLabel}
              maxLength={500}
              className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <div>
            <FieldHeader
              label="קישור למקור (אופציונלי)"
              field="sourceUrl"
              enabled={enabledFields.sourceUrl}
              inheritedResolution={inheritedResolution}
              onToggle={(enabled) => toggleField("sourceUrl", enabled)}
            />
            <input
              dir="ltr"
              type="url"
              value={draft.sourceUrl}
              onChange={(event) => updateDraft("sourceUrl", event.target.value)}
              disabled={!enabledFields.sourceUrl}
              maxLength={2000}
              placeholder="https://..."
              className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-left text-sm text-ink disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            />
            {enabledFields.sourceUrl && !draft.sourceUrl.trim() ? (
              <p className="mt-2 text-xs font-bold text-slate-500">ללא קישור ברמה זו; שם המקור יוצג כטקסט.</p>
            ) : null}
          </div>
        </section>

        {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{message}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={save} disabled={isSaving || hasInvalidField}>
            {isSaving ? "שומר..." : selectedOverride ? "עדכון ההתאמה" : "שמירת התאמה"}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={resetOverride}
            disabled={isSaving || !selectedOverride}
          >
            איפוס כל השדות ברמה שנבחרה
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function contentDefaults({
  metricLabel,
  fallbackText,
  sourceLabel,
  sourceUrl
}: {
  metricLabel: string;
  fallbackText?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
}): MetricContentDefaults {
  return { title: metricLabel, explanation: fallbackText, sourceLabel, sourceUrl };
}

export function MetricContentTitle({
  metricKey,
  fallbackTitle
}: {
  metricKey?: string | null;
  fallbackTitle: string;
}) {
  const provider = useContext(MetricExplanationContextValue);
  const supportedKey = isMetricExplanationKey(metricKey) ? metricKey : null;
  const title = supportedKey
    ? resolveMetricContent(supportedKey, provider?.context ?? {}, provider?.overrides ?? [], {
        title: fallbackTitle
      }).title
    : fallbackTitle;

  return <MetricRichText value={title} />;
}

export function MetricExplanationInfo({
  metricKey,
  metricLabel,
  fallbackText,
  sourceLabel,
  sourceUrl
}: {
  metricKey?: string | null;
  metricLabel: string;
  fallbackText?: string | null;
  sourceLabel: string;
  sourceUrl?: string | null;
}) {
  const provider = useContext(MetricExplanationContextValue);
  const supportedKey = isMetricExplanationKey(metricKey) ? metricKey : null;
  const defaults = contentDefaults({ metricLabel, fallbackText, sourceLabel, sourceUrl });
  const resolution = supportedKey
    ? resolveMetricContent(
        supportedKey,
        provider?.context ?? {},
        provider?.overrides ?? [],
        defaults
      )
    : null;
  const explanation = resolution?.explanation ?? fallbackText?.trim() ?? "";
  const resolvedSourceLabel = resolution
    ? resolution.sourceLabel
    : sourceLabel.trim() || null;
  const resolvedSourceUrl = resolution
    ? resolution.sourceUrl
    : sourceUrl?.trim() || null;
  const tooltipText = [
    metricRichTextToPlainText(explanation),
    resolvedSourceLabel ? `מקור נתונים: ${resolvedSourceLabel}` : ""
  ].filter(Boolean).join("\n");
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
        <span className="pointer-events-auto absolute left-0 top-9 z-20 hidden w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          {explanation ? (
            <span className="block"><MetricRichText value={explanation} /></span>
          ) : null}
          {resolvedSourceLabel ? (
            <span className="mt-1 block">
              מקור נתונים: <MetricSource label={resolvedSourceLabel} url={resolvedSourceUrl} />
            </span>
          ) : null}
        </span>
      </span>
      {provider?.isAdmin && supportedKey ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-brand-200 bg-white text-[0.7rem] font-black text-brand-700 transition hover:bg-brand-50"
          title="עריכת תוכן המדד"
          aria-label={`עריכת תוכן המדד: ${metricRichTextToPlainText(resolution?.title ?? metricLabel)}`}
        >
          ✎
        </button>
      ) : null}
      {provider?.isAdmin && supportedKey ? (
        <MetricExplanationEditor
          metricKey={supportedKey}
          defaults={defaults}
          open={isEditing}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </span>
  );
}
