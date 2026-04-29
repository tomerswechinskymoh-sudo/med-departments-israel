"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClipboardHeartIcon,
  DepartmentDirectoryIcon,
  HospitalBuildingIcon,
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

type SuggestionItem =
  | {
      key: string;
      type: "institution";
      value: string;
      title: string;
      subtitle: string;
    }
  | {
      key: string;
      type: "specialty";
      value: string;
      title: string;
      subtitle: string;
    }
  | {
      key: string;
      type: "department";
      value: string;
      title: string;
      subtitle: string;
    };

function buildAdvancedSummary(filters: {
  prioritizeOpenings?: boolean;
  prioritizeCommittee?: boolean;
  researchPriority?: number;
  electivePriority?: number;
  lifestylePriority?: number;
  teachingPriority?: number;
  seniorsPriority?: number;
  clinicalPriority?: number;
}) {
  const chips: string[] = [];

  if (filters.prioritizeOpenings) {
    chips.push("תקנים פתוחים");
  }

  if (filters.prioritizeCommittee) {
    chips.push("ועדה מתוכננת");
  }

  if (filters.researchPriority) {
    chips.push(`מחקר ${filters.researchPriority}/5`);
  }

  if (filters.electivePriority) {
    chips.push(`אלקטיב ${filters.electivePriority}/5`);
  }

  if (filters.lifestylePriority) {
    chips.push(`איזון חיים ${filters.lifestylePriority}/5`);
  }

  if (filters.teachingPriority) {
    chips.push(`הוראה ${filters.teachingPriority}/5`);
  }

  if (filters.seniorsPriority) {
    chips.push(`בכירים ${filters.seniorsPriority}/5`);
  }

  if (filters.clinicalPriority) {
    chips.push(`חשיפה קלינית ${filters.clinicalPriority}/5`);
  }

  return chips;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("he");
}

function highlightMatch(text: string, query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return text;
  }

  const lowerText = text.toLocaleLowerCase("he");
  const lowerQuery = normalizedQuery.toLocaleLowerCase("he");
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return text;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-amber-100 px-0.5 text-inherit">{match}</mark>
      {after}
    </>
  );
}

function buildSearchParams(formData: FormData) {
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    params.append(key, trimmed);
  }

  return params;
}

function SuggestionGroup({
  title,
  suggestions,
  query,
  activeIndex,
  offset,
  onSelect
}: {
  title: string;
  suggestions: SuggestionItem[];
  query: string;
  activeIndex: number;
  offset: number;
  onSelect: (suggestion: SuggestionItem) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="px-3 text-[0.7rem] font-bold tracking-wide text-slate-400">{title}</p>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => {
          const absoluteIndex = offset + index;
          const isActive = absoluteIndex === activeIndex;

          return (
            <button
              key={suggestion.key}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(suggestion);
              }}
              className={`flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-right transition ${
                isActive ? "bg-brand-50 text-brand-900" : "hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {highlightMatch(suggestion.title, query)}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {highlightMatch(suggestion.subtitle, query)}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-slate-500">
                {suggestion.type === "institution"
                  ? "מוסד"
                  : suggestion.type === "specialty"
                    ? "תחום"
                    : "מחלקה"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DepartmentFilters({
  filters,
  institutions,
  specialties,
  departments,
  regions
}: {
  filters: {
    search?: string;
    institutions?: string[];
    specialties?: string[];
    regions?: string[];
    institutionTypes?: Array<"HOSPITAL" | "HMO">;
    hasOpenPositions?: boolean;
    hasResearch?: boolean;
    hasReviews?: boolean;
    sort?: "recommended" | "rating" | "reviews" | "openings" | "research";
    prioritizeOpenings?: boolean;
    prioritizeCommittee?: boolean;
    researchPriority?: number;
    electivePriority?: number;
    lifestylePriority?: number;
    teachingPriority?: number;
    seniorsPriority?: number;
    clinicalPriority?: number;
  };
  institutions: { id: string; name: string; type: "HOSPITAL" | "HMO"; region: string }[];
  specialties: { id: string; name: string }[];
  departments: {
    id: string;
    name: string;
    institution: { id: string; name: string };
    specialty: { id: string; name: string };
  }[];
  regions: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const deferredSearchValue = useDeferredValue(searchValue);
  const summaryChips = buildAdvancedSummary(filters);
  const hasAdvancedFilters = summaryChips.length > 0;
  const selectedSpecialtyId = filters.specialties?.[0];

  const suggestionGroups = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(deferredSearchValue);
    const departmentsForSelectedSpecialty = selectedSpecialtyId
      ? departments.filter((department) => department.specialty.id === selectedSpecialtyId)
      : [];
    const institutionIdsForSelectedSpecialty = new Set(
      departmentsForSelectedSpecialty.map((department) => department.institution.id)
    );

    if (!normalizedQuery) {
      return {
        institutions: [] as SuggestionItem[],
        specialties: [] as SuggestionItem[],
        departments: [] as SuggestionItem[],
        flat: [] as SuggestionItem[]
      };
    }

    const institutionSuggestions = institutions
      .filter(
        (institution) =>
          institutionIdsForSelectedSpecialty.has(institution.id) &&
          normalizeSearchValue(institution.name).includes(normalizedQuery)
      )
      .slice(0, 3)
      .map(
        (institution): SuggestionItem => ({
          key: `institution-${institution.id}`,
          type: "institution",
          value: institution.id,
          title: institution.name,
          subtitle: institution.type === "HOSPITAL" ? "בית חולים" : "קהילה / קופה"
        })
      );

    const specialtySuggestions = specialties
      .filter((specialty) => normalizeSearchValue(specialty.name).includes(normalizedQuery))
      .slice(0, 3)
      .map(
        (specialty): SuggestionItem => ({
          key: `specialty-${specialty.id}`,
          type: "specialty",
          value: specialty.id,
          title: specialty.name,
          subtitle: "תחום התמחות"
        })
      );

    const departmentSuggestions = departmentsForSelectedSpecialty
      .filter((department) => {
        const haystack = `${department.name} ${department.institution.name} ${department.specialty.name}`;
        return normalizeSearchValue(haystack).includes(normalizedQuery);
      })
      .slice(0, 4)
      .map(
        (department): SuggestionItem => ({
          key: `department-${department.id}`,
          type: "department",
          value: department.name,
          title: department.name,
          subtitle: `${department.institution.name} · ${department.specialty.name}`
        })
      );

    const flat = [...institutionSuggestions, ...specialtySuggestions, ...departmentSuggestions].slice(
      0,
      10
    );

    return {
      institutions: institutionSuggestions,
      specialties: specialtySuggestions,
      departments: departmentSuggestions,
      flat
    };
  }, [deferredSearchValue, departments, institutions, selectedSpecialtyId, specialties]);

  const hasSuggestions = suggestionGroups.flat.length > 0 && searchValue.trim().length > 0;

  const submitWithFormData = (formData: FormData) => {
    const params = buildSearchParams(formData);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  const submitCurrentForm = () => {
    if (!formRef.current) {
      return;
    }

    submitWithFormData(new FormData(formRef.current));
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitCurrentForm();
  };

  const handleFormChange = (event: ChangeEvent<HTMLFormElement>) => {
    const target = event.target as unknown as HTMLInputElement | HTMLSelectElement;

    if (target.name === "search") {
      return;
    }

    window.requestAnimationFrame(submitCurrentForm);
  };

  const applySuggestion = (suggestion: SuggestionItem) => {
    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);

    if (suggestion.type === "department") {
      formData.set("search", suggestion.value);
      setSearchValue(suggestion.value);
    }

    if (suggestion.type === "institution") {
      const currentValues = formData.getAll("institution").map(String);
      if (!currentValues.includes(suggestion.value)) {
        formData.append("institution", suggestion.value);
      }
      formData.delete("search");
      setSearchValue("");
    }

    if (suggestion.type === "specialty") {
      formData.delete("specialty");
      formData.set("specialty", suggestion.value);
      formData.delete("search");
      setSearchValue("");
    }

    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    submitWithFormData(formData);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!hasSuggestions) {
      if (event.key === "Escape") {
        setSuggestionsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((currentIndex) =>
        currentIndex + 1 >= suggestionGroups.flat.length ? 0 : currentIndex + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((currentIndex) =>
        currentIndex <= 0 ? suggestionGroups.flat.length - 1 : currentIndex - 1
      );
      return;
    }

    if (event.key === "Enter" && suggestionsOpen && activeSuggestionIndex >= 0) {
      event.preventDefault();
      const activeSuggestion = suggestionGroups.flat[activeSuggestionIndex];
      if (activeSuggestion) {
        applySuggestion(activeSuggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  return (
    <Card className="sticky top-24 overflow-visible rounded-[1.25rem] border border-brand-100/80 bg-white/96 p-0">
      <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange} className="space-y-4 p-4">
        <div className="rounded-[1.15rem] border border-brand-200 bg-gradient-to-br from-brand-900 to-brand-700 p-4 text-white shadow-sm">
          <div>
            <p className="text-xs font-bold text-brand-100">בחירת התמחות</p>
            <p className="mt-1 text-lg font-bold leading-7">
              קודם בוחרים תחום, ואז משווים תוכניות.
            </p>
          </div>
          <select
            name="specialty"
            defaultValue={filters.specialties?.[0] ?? specialties[0]?.id ?? ""}
            className="mt-4 w-full rounded-xl border border-white/30 bg-white px-3 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-200 focus:ring-2 focus:ring-white/35"
          >
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              name="search"
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setSuggestionsOpen(event.target.value.trim().length > 0);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => {
                if (searchValue.trim()) {
                  setSuggestionsOpen(true);
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setSuggestionsOpen(false);
                  setActiveSuggestionIndex(-1);
                }, 120);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="חיפוש לפי מחלקה, מוסד או תחום"
              autoComplete="off"
              aria-expanded={hasSuggestions && suggestionsOpen}
              aria-controls="department-search-suggestions"
              className="w-full rounded-xl border border-brand-100 bg-surface px-3 py-3 text-sm outline-none ring-0 transition focus:border-brand-300"
            />

            {hasSuggestions && suggestionsOpen ? (
              <div
                id="department-search-suggestions"
                className="absolute inset-x-0 top-[calc(100%+0.6rem)] z-30 rounded-[1.5rem] border border-brand-100 bg-white p-3 shadow-panel"
              >
                <div className="space-y-3">
                  <SuggestionGroup
                    title="מוסדות"
                    suggestions={suggestionGroups.institutions}
                    query={searchValue}
                    activeIndex={activeSuggestionIndex}
                    offset={0}
                    onSelect={applySuggestion}
                  />
                  <SuggestionGroup
                    title="תחומים"
                    suggestions={suggestionGroups.specialties}
                    query={searchValue}
                    activeIndex={activeSuggestionIndex}
                    offset={suggestionGroups.institutions.length}
                    onSelect={applySuggestion}
                  />
                  <SuggestionGroup
                    title="מחלקות"
                    suggestions={suggestionGroups.departments}
                    query={searchValue}
                    activeIndex={activeSuggestionIndex}
                    offset={
                      suggestionGroups.institutions.length + suggestionGroups.specialties.length
                    }
                    onSelect={applySuggestion}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="department-sort" className="mb-2 block text-xs font-bold text-slate-500">
              סידור תוצאות
            </label>
            <select
              id="department-sort"
              name="sort"
              defaultValue={filters.sort ?? "recommended"}
              className="w-full rounded-xl border border-brand-100 bg-white px-3 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300"
            >
              <option value="recommended">מומלץ</option>
              <option value="rating">דירוג גבוה</option>
              <option value="reviews">יותר ביקורות</option>
              <option value="openings">תקנים פתוחים קודם</option>
              <option value="research">מחקר פעיל קודם</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3">
            <fieldset className="rounded-xl border border-brand-100 bg-brand-50/45 p-3">
              <legend className="px-2 text-sm font-semibold text-ink">אזור</legend>
              <div className="mt-2 grid gap-2">
                {regions.map((region) => (
                  <label
                    key={region}
                    className="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="region"
                      value={region}
                      defaultChecked={filters.regions?.includes(region)}
                    />
                    <span>{region}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-brand-100 bg-brand-50/45 p-3">
              <legend className="px-2 text-sm font-semibold text-ink">סוג מוסד</legend>
              <div className="mt-2 grid gap-2">
                {[
                  { value: "HOSPITAL", label: "בתי חולים" },
                  { value: "HMO", label: "קופות / קהילה" }
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="institutionType"
                      value={option.value}
                      defaultChecked={filters.institutionTypes?.includes(
                        option.value as "HOSPITAL" | "HMO"
                      )}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-brand-100 bg-brand-50/45 p-3">
              <legend className="px-2 text-sm font-semibold text-ink">סימני תוכנית</legend>
              <div className="mt-2 grid gap-2">
                {[
                  { name: "hasOpenPositions", label: "יש תקנים פתוחים", checked: filters.hasOpenPositions },
                  { name: "hasResearch", label: "יש מחקר פעיל", checked: filters.hasResearch },
                  { name: "hasReviews", label: "יש ביקורות", checked: filters.hasReviews }
                ].map((option) => (
                  <label
                    key={option.name}
                    className="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name={option.name}
                      value="1"
                      defaultChecked={option.checked}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-brand-100 bg-brand-50/45 p-3">
              <legend className="px-2 text-sm font-semibold text-ink">מוסדות</legend>
              <div className="mt-2 grid max-h-52 gap-2 overflow-y-auto pr-1">
                {institutions.map((institution) => (
                  <label
                    key={institution.id}
                    className="flex items-start gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="institution"
                      value={institution.id}
                      defaultChecked={filters.institutions?.includes(institution.id)}
                    />
                    <span>
                      {institution.name}
                      <span className="mr-2 block text-xs text-slate-500">
                        {institution.type === "HOSPITAL" ? "בית חולים" : "קהילה / קופה"} · {institution.region}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

        </div>

        <details open={hasAdvancedFilters} className="rounded-xl border border-brand-100 bg-white">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-900">
                <DepartmentDirectoryIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">חיפוש מתקדם</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  דירוג תוצאות לפי מה שחשוב לך, בלי לסנן קשיח מחלקות החוצה.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {summaryChips.length > 0 ? (
                summaryChips.slice(0, 3).map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-brand-100 bg-brand-50/70 px-3 py-1 text-xs font-semibold text-brand-800"
                  >
                    {chip}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  סגור כברירת מחדל
                </span>
              )}
              <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-semibold text-brand-800">
                לפתיחה / סגירה
              </span>
            </div>
          </summary>

          <div className="border-t border-brand-100/80 px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/35 px-3 py-3 text-sm text-slate-700">
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

              <label className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/35 px-3 py-3 text-sm text-slate-700">
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-brand-100 bg-white p-3">
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
                    <option key={`${option.value}-teaching`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white p-3">
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
                    <option key={`${option.value}-seniors`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white p-3">
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
                    <option key={`${option.value}-lifestyle`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white p-3">
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
                    <option key={`${option.value}-research`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white p-3">
                <div className="flex items-center gap-2 text-brand-700">
                  <HospitalBuildingIcon className="h-4 w-4" />
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
                    <option key={`${option.value}-elective`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white p-3">
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
                    <option key={`${option.value}-clinical`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </details>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">חפש מחלקות</Button>
          <a
            href={filters.specialties?.[0] ? `/departments?specialty=${filters.specialties[0]}` : "/departments"}
            className="inline-flex items-center rounded-2xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-800"
          >
            איפוס
          </a>
        </div>
      </form>
    </Card>
  );
}
