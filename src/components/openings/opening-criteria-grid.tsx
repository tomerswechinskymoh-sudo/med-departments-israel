import { OPENING_ACCEPTANCE_CRITERIA_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function toneForValue(value: number) {
  if (value >= 5) {
    return "bg-brand-800";
  }

  if (value >= 4) {
    return "bg-brand-700";
  }

  if (value >= 3) {
    return "bg-teal-600";
  }

  if (value >= 2) {
    return "bg-amber-500";
  }

  return "bg-slate-300";
}

export function OpeningCriteriaGrid({
  criteria,
  compact = false
}: {
  criteria: {
    researchImportance: number;
    departmentElectiveImportance: number;
    departmentInternshipImportance: number;
    residentSelectionInfluence: number;
    specialistSelectionInfluence: number;
    departmentHeadInfluence: number;
    medicalSchoolInfluence: number;
    recommendationsImportance: number;
    personalFitImportance: number;
    previousDepartmentExperienceImportance: number;
    notes?: string | null;
    whatWeAreLookingFor?: string | null;
  } | null;
  compact?: boolean;
}) {
  if (!criteria) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4")}>
        {OPENING_ACCEPTANCE_CRITERIA_LABELS.map((item) => {
          const value = criteria[item.key];

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-brand-100 bg-white/85 p-4"
            >
              <p className="text-xs font-semibold leading-6 text-slate-500">{item.label}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("rounded-full transition-all", toneForValue(value))}
                    style={{ width: `${value * 20}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-ink">{value}/5</span>
              </div>
            </div>
          );
        })}
      </div>
      {criteria.whatWeAreLookingFor ? (
        <div className="rounded-2xl border border-brand-100 bg-slate-900 px-4 py-4 text-sm leading-7 text-white">
          <span className="font-semibold text-white">מה אנחנו מחפשים: </span>
          {criteria.whatWeAreLookingFor}
        </div>
      ) : null}
      {criteria.notes ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm leading-7 text-slate-700">
          <span className="font-semibold text-ink">הערת המחלקה: </span>
          {criteria.notes}
        </div>
      ) : null}
    </div>
  );
}
