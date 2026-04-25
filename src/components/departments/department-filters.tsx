import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClipboardHeartIcon,
  DepartmentDirectoryIcon,
  SearchPulseIcon,
  ShieldCheckIcon,
  StethoscopeIcon
} from "@/components/ui/med-icons";

const priorityOptions = [
  { value: "", label: "לא משנה" },
  { value: "1", label: "1 · מעט" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5 · חשוב מאוד" }
];

export function DepartmentFilters({
  filters,
  institutions,
  specialties
}: {
  filters: {
    search?: string;
    institutions?: string[];
    specialties?: string[];
    prioritizeOpenings?: boolean;
    prioritizeCommittee?: boolean;
    researchPriority?: number;
    electivePriority?: number;
    lifestylePriority?: number;
    teachingPriority?: number;
    seniorsPriority?: number;
    clinicalPriority?: number;
  };
  institutions: { id: string; name: string; type: "HOSPITAL" | "HMO" }[];
  specialties: { id: string; name: string }[];
}) {
  const hasAdvancedFilters = Boolean(
    filters.prioritizeOpenings ||
      filters.prioritizeCommittee ||
      filters.researchPriority ||
      filters.electivePriority ||
      filters.lifestylePriority ||
      filters.teachingPriority ||
      filters.seniorsPriority ||
      filters.clinicalPriority
  );

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-brand-100/80 bg-white/96 p-0">
      <form className="space-y-6 p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-900 text-white">
                  <SearchPulseIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-700">חיפוש בסיסי</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    חפשו לפי מחלקה, מוסד או תחום. הסינון במוסדות ובתחומים עובד ב־OR בתוך כל קבוצה.
                  </p>
                </div>
              </div>
              <input
                type="text"
                name="search"
                defaultValue={filters.search}
                placeholder="חיפוש לפי מחלקה, מוסד או תחום"
                className="mt-4 w-full rounded-[1.5rem] border border-brand-100 bg-surface px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-300"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <fieldset className="rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4">
                <legend className="px-2 text-sm font-semibold text-ink">מוסדות</legend>
                <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">
                  {institutions.map((institution) => (
                    <label
                      key={institution.id}
                      className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        name="institution"
                        value={institution.id}
                        defaultChecked={filters.institutions?.includes(institution.id)}
                      />
                      <span>
                        {institution.name}
                        <span className="mr-2 text-xs text-slate-500">
                          {institution.type === "HOSPITAL" ? "בית חולים" : "קהילה / קופה"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4">
                <legend className="px-2 text-sm font-semibold text-ink">תחומים</legend>
                <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">
                  {specialties.map((specialty) => (
                    <label
                      key={specialty.id}
                      className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        name="specialty"
                        value={specialty.id}
                        defaultChecked={filters.specialties?.includes(specialty.id)}
                      />
                      <span>{specialty.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <details
            open={hasAdvancedFilters}
            className="rounded-[1.75rem] border border-brand-100 bg-gradient-to-b from-white to-brand-50/55 p-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-900 shadow-panel">
                  <DepartmentDirectoryIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-700">חיפוש מתקדם</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    כאן לא מסננים קשיח, אלא מסדרים את המחלקות לפי מה שחשוב לך יותר.
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold text-brand-800">
                {hasAdvancedFilters ? "פעיל" : "לפתיחה"}
              </span>
            </summary>

            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-3 rounded-[1.25rem] border border-brand-100 bg-white px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="prioritizeOpenings"
                    value="1"
                    defaultChecked={filters.prioritizeOpenings}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-ink">לתעדף תקנים פתוחים</span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      מחלקות עם תקנים פתוחים יקבלו דחיפה כלפי מעלה.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-[1.25rem] border border-brand-100 bg-white px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="prioritizeCommittee"
                    value="1"
                    defaultChecked={filters.prioritizeCommittee}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-ink">לתעדף ועדה מתוכננת</span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      נותן עדיפות למחלקות עם מועד ועדה קרוב שכבר פורסם.
                    </span>
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-brand-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <ShieldCheckIcon className="h-4 w-4" />
                    <label className="text-sm font-semibold text-ink" htmlFor="teachingPriority">
                      איכות הוראה
                    </label>
                  </div>
                  <select
                    id="teachingPriority"
                    name="teachingPriority"
                    defaultValue={filters.teachingPriority ? String(filters.teachingPriority) : ""}
                    className="mt-3 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[1.25rem] border border-brand-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <StethoscopeIcon className="h-4 w-4" />
                    <label className="text-sm font-semibold text-ink" htmlFor="seniorsPriority">
                      נגישות בכירים
                    </label>
                  </div>
                  <select
                    id="seniorsPriority"
                    name="seniorsPriority"
                    defaultValue={filters.seniorsPriority ? String(filters.seniorsPriority) : ""}
                    className="mt-3 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[1.25rem] border border-brand-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <ClipboardHeartIcon className="h-4 w-4" />
                    <label className="text-sm font-semibold text-ink" htmlFor="lifestylePriority">
                      עומס ואיזון חיים
                    </label>
                  </div>
                  <select
                    id="lifestylePriority"
                    name="lifestylePriority"
                    defaultValue={filters.lifestylePriority ? String(filters.lifestylePriority) : ""}
                    className="mt-3 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[1.25rem] border border-brand-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <DepartmentDirectoryIcon className="h-4 w-4" />
                    <label className="text-sm font-semibold text-ink" htmlFor="researchPriority">
                      חשיבות מחקר
                    </label>
                  </div>
                  <select
                    id="researchPriority"
                    name="researchPriority"
                    defaultValue={filters.researchPriority ? String(filters.researchPriority) : ""}
                    className="mt-3 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[1.25rem] border border-brand-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <DepartmentDirectoryIcon className="h-4 w-4" />
                    <label className="text-sm font-semibold text-ink" htmlFor="electivePriority">
                      חשיבות אלקטיב / סבב
                    </label>
                  </div>
                  <select
                    id="electivePriority"
                    name="electivePriority"
                    defaultValue={filters.electivePriority ? String(filters.electivePriority) : ""}
                    className="mt-3 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[1.25rem] border border-brand-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-brand-700">
                    <SearchPulseIcon className="h-4 w-4" />
                    <label className="text-sm font-semibold text-ink" htmlFor="clinicalPriority">
                      חשיפה קלינית
                    </label>
                  </div>
                  <select
                    id="clinicalPriority"
                    name="clinicalPriority"
                    defaultValue={filters.clinicalPriority ? String(filters.clinicalPriority) : ""}
                    className="mt-3 w-full rounded-2xl border border-brand-100 bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </details>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">חפש מחלקות</Button>
          <a
            href="/departments"
            className="inline-flex items-center rounded-2xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-800"
          >
            איפוס
          </a>
        </div>
      </form>
    </Card>
  );
}
