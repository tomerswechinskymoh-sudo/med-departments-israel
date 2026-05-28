"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

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
    regions?: string[];
    specialties?: string[];
    sort?: "recommended" | "rating" | "reviews" | "openings" | "research";
  };
  institutions: { id: string; name: string; type: "HOSPITAL" | "HMO"; region: string }[];
  specialties: { id: string; name: string }[];
  regions: readonly string[];
  departments: {
    id: string;
    name: string;
    institution: { id: string; name: string };
    specialty: { id: string; name: string };
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const deferredSearchValue = useDeferredValue(searchValue);
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
          value: institution.name,
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

    const flat = [...institutionSuggestions, ...specialtySuggestions, ...departmentSuggestions].slice(0, 10);

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

    if (suggestion.type === "specialty") {
      formData.set("specialty", suggestion.value);
      formData.delete("search");
      setSearchValue("");
    } else {
      formData.set("search", suggestion.value);
      setSearchValue(suggestion.value);
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
        <input
          type="hidden"
          name="specialty"
          value={filters.specialties?.[0] ?? specialties[0]?.id ?? ""}
          readOnly
        />

        <div>
          <p className="text-sm font-bold text-ink">חיפוש</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            חיפוש לפי מוסד או מחלקה. בחירת תחום ההתמחות נשארת בראש העמוד.
          </p>
        </div>

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
            placeholder="חיפוש לפי מחלקה או מוסד"
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
                  offset={suggestionGroups.institutions.length + suggestionGroups.specialties.length}
                  onSelect={applySuggestion}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">אזור</p>
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => {
              const inputId = `region-${region}`;
              const checked = filters.regions?.includes(region) ?? false;

              return (
                <label
                  key={region}
                  htmlFor={inputId}
                  className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold transition ${
                    checked
                      ? "border-brand-300 bg-brand-700 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50"
                  }`}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    name="region"
                    value={region}
                    defaultChecked={checked}
                    className="sr-only"
                  />
                  {region}
                </label>
              );
            })}
          </div>
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

        <button
          type="submit"
          className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
        >
          הצגת תוצאות
        </button>
      </form>
    </Card>
  );
}
