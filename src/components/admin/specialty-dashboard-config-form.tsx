"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  defaultSpecialtyDashboardMetrics,
  normalizeMetricKeys,
  orderedMetricKeys,
  specialtyMetricDefinitions,
  type SpecialtyMetricKey
} from "@/lib/specialty-metrics";

type SpecialtyOption = {
  id: string;
  name: string;
};

type DashboardConfig = {
  specialtyId: string;
  enabledMetricsJson: unknown;
  displayOrderJson: unknown;
};

export function SpecialtyDashboardConfigForm({
  specialties,
  configs
}: {
  specialties: SpecialtyOption[];
  configs: DashboardConfig[];
}) {
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState(specialties[0]?.id ?? "");
  const [localConfigs, setLocalConfigs] = useState(configs);
  const activeConfig = localConfigs.find((config) => config.specialtyId === selectedSpecialtyId);
  const initialEnabled = normalizeMetricKeys(
    activeConfig?.enabledMetricsJson,
    defaultSpecialtyDashboardMetrics
  );
  const initialOrder = normalizeMetricKeys(activeConfig?.displayOrderJson, initialEnabled);
  const [enabledMetrics, setEnabledMetrics] = useState<SpecialtyMetricKey[]>(initialEnabled);
  const [displayOrder, setDisplayOrder] = useState<SpecialtyMetricKey[]>(
    orderedMetricKeys(initialEnabled, initialOrder)
  );
  const [draggedMetric, setDraggedMetric] = useState<SpecialtyMetricKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedSpecialtyName = specialties.find((specialty) => specialty.id === selectedSpecialtyId)?.name;
  const orderedEnabledDefinitions = useMemo(
    () =>
      orderedMetricKeys(enabledMetrics, displayOrder)
        .map((key) => specialtyMetricDefinitions.find((metric) => metric.key === key))
        .filter((metric): metric is (typeof specialtyMetricDefinitions)[number] => Boolean(metric)),
    [displayOrder, enabledMetrics]
  );

  function selectSpecialty(specialtyId: string) {
    const nextConfig = localConfigs.find((config) => config.specialtyId === specialtyId);
    const nextEnabled = normalizeMetricKeys(
      nextConfig?.enabledMetricsJson,
      defaultSpecialtyDashboardMetrics
    );
    const nextOrder = normalizeMetricKeys(nextConfig?.displayOrderJson, nextEnabled);

    setSelectedSpecialtyId(specialtyId);
    setEnabledMetrics(nextEnabled);
    setDisplayOrder(orderedMetricKeys(nextEnabled, nextOrder));
    setMessage(null);
    setError(null);
  }

  function toggleMetric(metricKey: SpecialtyMetricKey) {
    setEnabledMetrics((current) => {
      const next = current.includes(metricKey)
        ? current.filter((key) => key !== metricKey)
        : [...current, metricKey];

      setDisplayOrder((order) => orderedMetricKeys(next, [...order, metricKey]));
      return next;
    });
  }

  function moveMetric(metricKey: SpecialtyMetricKey, targetMetric: SpecialtyMetricKey) {
    setDisplayOrder((current) => {
      const withoutDragged = current.filter((key) => key !== metricKey);
      const targetIndex = withoutDragged.indexOf(targetMetric);
      if (targetIndex === -1) return current;
      return [
        ...withoutDragged.slice(0, targetIndex),
        metricKey,
        ...withoutDragged.slice(targetIndex)
      ];
    });
  }

  async function saveConfig() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/specialty-dashboard-configs", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        specialtyId: selectedSpecialtyId,
        enabledMetrics,
        displayOrder: orderedMetricKeys(enabledMetrics, displayOrder)
      })
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? "שמירת הדשבורד נכשלה.");
      return;
    }

    setMessage(payload.message ?? "הדשבורד נשמר.");
    setLocalConfigs((current) => [
      ...current.filter((config) => config.specialtyId !== selectedSpecialtyId),
      {
        specialtyId: selectedSpecialtyId,
        enabledMetricsJson: enabledMetrics,
        displayOrderJson: orderedMetricKeys(enabledMetrics, displayOrder)
      }
    ]);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">תחום התמחות</span>
          <select
            value={selectedSpecialtyId}
            onChange={(event) => selectSpecialty(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-brand-300"
          >
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
          <p className="text-sm font-bold text-ink">מוצג למשתמשים בתחום {selectedSpecialtyName}</p>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            רק מדדים מסומנים יוצגו. אם אין מספיק נתונים למדד, המשתמשים יראו הודעת חסר קצרה
            במקום מספר מטעה.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {specialtyMetricDefinitions.map((metric) => (
            <label
              key={metric.key}
              className="flex cursor-pointer gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand-200"
            >
              <input
                type="checkbox"
                checked={enabledMetrics.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-ink">{metric.label}</span>
                <span className="mt-1 block text-xs leading-6 text-slate-500">{metric.description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-ink">סדר תצוגה</p>
          <p className="mt-1 text-xs text-slate-500">גררו מדדים כדי לשנות סדר.</p>
          <div className="mt-3 space-y-2">
            {orderedEnabledDefinitions.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                לא נבחרו מדדים.
              </p>
            ) : (
              orderedEnabledDefinitions.map((metric) => (
                <div
                  key={metric.key}
                  draggable
                  onDragStart={() => setDraggedMetric(metric.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedMetric && draggedMetric !== metric.key) {
                      moveMetric(draggedMetric, metric.key);
                    }
                    setDraggedMetric(null);
                  }}
                  className="cursor-grab rounded-2xl border border-brand-100 bg-brand-50/70 px-3 py-3 text-sm font-bold text-brand-900 active:cursor-grabbing"
                >
                  {metric.label}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      <Button type="button" onClick={saveConfig} disabled={isSaving || !selectedSpecialtyId}>
        {isSaving ? "שומר..." : "שמירת דשבורד תחום"}
      </Button>
    </div>
  );
}
