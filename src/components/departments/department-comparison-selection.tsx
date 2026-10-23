"use client";


import Link from "next/link";
import { InstitutionLogo } from "./institution-logo";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DepartmentCompareOption = {
  id: string;
  slug?: string;
  name: string;
  institutionName: string;
  institutionSlug?: string | null;
  institutionBrandingKey?: string | null;
  specialtyId: string;
  specialtyName: string;
  isArray?: boolean;
};

type CompareContextValue = {
  selected: DepartmentCompareOption[];
  isAuthenticated: boolean;
  specialtyId: string;
  message: string | null;
  compareUrl: string;
  isSelected: (id: string) => boolean;
  toggle: (option: DepartmentCompareOption) => void;
  clear: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);
const MAX_COMPARE_ITEMS = 4;

function storageKey(specialtyId: string) {
  return `departmentCompare:${specialtyId}`;
}

function readStoredSelection(specialtyId: string) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey(specialtyId)) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredSelection(
  specialtyId: string,
  selected: DepartmentCompareOption[],
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey(specialtyId),
      JSON.stringify(selected),
    );
  } catch {
    /* Selection remains usable in memory. */
  }
}

function buildCompareUrl(
  specialtyId: string,
  selected: DepartmentCompareOption[],
) {
  const params = new URLSearchParams();
  params.set("specialty", specialtyId);
  params.set("departments", selected.map((item) => item.id).join(","));

  return `/compare?${params.toString()}`;
}

function useCompareContext() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error(
      "Department comparison controls must be rendered inside DepartmentCompareProvider.",
    );
  }

  return context;
}

export function DepartmentCompareProvider({
  specialtyId,
  isAuthenticated,
  children,
  layout = "bar",
}: {
  layout?: "bar" | "sidebar" | "top";
  specialtyId: string;
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<DepartmentCompareOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loadedSpecialty, setLoadedSpecialty] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = readStoredSelection(specialtyId)
      .filter((item): item is DepartmentCompareOption =>
        Boolean(item?.id && item?.specialtyId === specialtyId),
      )
      .slice(0, MAX_COMPARE_ITEMS);
    setSelected(stored);
    setLoadedSpecialty(specialtyId);
  }, [specialtyId]);

  useEffect(() => {
    if (loadedSpecialty === specialtyId)
      writeStoredSelection(specialtyId, selected);
  }, [selected, specialtyId, loadedSpecialty]);

  const compareUrl = useMemo(
    () => buildCompareUrl(specialtyId, selected),
    [selected, specialtyId],
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      selected,
      isAuthenticated,
      specialtyId,
      message,
      compareUrl,
      isSelected: (id) => selected.some((item) => item.id === id),
      toggle: (option) => {
        setMessage(null);

        if (option.specialtyId !== specialtyId) {
          setMessage("ניתן להשוות מחלקות רק בתוך אותו תחום התמחות.");
          return;
        }

        if (selected.some((item) => item.id === option.id)) {
          const remaining = selected.filter((item) => item.id !== option.id);
          setSelected(remaining);

          return;
        }
        if (selected.length >= MAX_COMPARE_ITEMS) {
          setMessage("ניתן להשוות עד 4 מחלקות בכל פעם.");
          return;
        }
        setSelected([...selected, option]);

      },
      clear: () => {

        setSelected([]);
        setMessage(null);
      },
    }),
    [compareUrl, isAuthenticated, message, selected, specialtyId],
  );

  function openComparison() {
    if (selected.length === 0) {
      setMessage("בחרו לפחות מחלקה אחת להשוואה.");
      return;
    }

    if (new Set(selected.map((item) => item.specialtyId)).size > 1) {
      setMessage("ניתן להשוות מחלקות רק בתוך אותו תחום התמחות.");
      return;
    }

    if (!isAuthenticated) {
      setMessage("כדי לצפות בהשוואה יש להתחבר או להירשם.");
      router.push(`/login?next=${encodeURIComponent(compareUrl)}`);
      return;
    }

    router.push(compareUrl);
  }

  return (
    <CompareContext.Provider value={value}>
      <div className={layout === "sidebar" ? "directory-comparison-layout" : layout === "top" ? "comparison-layout--top" : "space-y-4"}>
        {children}
        <div
          className={`comparison-selection ${layout === "sidebar" ? "comparison-selection--sidebar" : layout === "bar" && selected.length ? "sticky bottom-4" : ""} z-30 rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-panel`}
        >
          {layout === "sidebar" && <>
            <h2 className="comparison-selection-title">להשוואה</h2>
            <div className="comparison-selection-items">
              {selected.map(option => <div key={option.id}>
                <InstitutionLogo institution={{ name: option.institutionName, slug: option.institutionSlug, brandingKey: option.institutionBrandingKey }} size="sm" />
                <span><strong>{option.institutionName}</strong><small>{option.name}</small></span>
                <button type="button" aria-label={`הסרת ${option.institutionName} מההשוואה`} onClick={() => value.toggle(option)}>×</button>
              </div>)}
              {!selected.length && <p>בחרו מחלקות מתוך התוצאות כדי לבחון אותן זו לצד זו.</p>}
            </div>
          </>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-ink">
                נבחרו {selected.length}/{MAX_COMPARE_ITEMS} להשוואה
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                ההשוואה נשמרת זמנית לתחום ההתמחות הנוכחי.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={value.clear}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                ניקוי
              </button>
              <button
                type="button"
                onClick={openComparison}
                className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-800"
              >
                השוואת מחלקות
              </button>
            </div>
          </div>
          {message ? (
            <p role="status" className="mt-2 text-xs font-bold text-amber-700">
              {message}
            </p>
          ) : null}
          {!isAuthenticated ? (
            <p className="mt-2 text-xs text-slate-600">
              כדי לצפות בטבלת ההשוואה יש להתחבר או להירשם.
            </p>
          ) : null}
          {pathname === "/compare" ? (
            <Link
              href="/departments"
              className="mt-2 inline-flex text-xs font-bold text-brand-700"
            >
              חזרה לחיפוש מחלקות
            </Link>
          ) : null}
        </div>
      </div>
    </CompareContext.Provider>
  );
}

export function CompareSelectableShell({
  option,
  children,
}: {
  option: DepartmentCompareOption;
  children: ReactNode;
}) {
  const comparison = useCompareContext();
  const selected = comparison.isSelected(option.id);

  return (
    <div className="compare-selectable">
      <div className="compare-selectable-action">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            comparison.toggle(option);
          }}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black shadow-sm transition ${
            selected
              ? "border-brand-300 bg-brand-700 text-white"
              : "border-slate-200 bg-white/95 text-slate-700 hover:border-brand-200 hover:text-brand-800"
          }`}
          aria-pressed={selected}
          title="בחירה להשוואה"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-lg border border-current text-[0.65rem]">
            {selected ? "✓" : "+"}
          </span>
          להשוואה
        </button>
      </div>
      {children}
    </div>
  );
}

export function DepartmentCompareProfileButton({
  option,
  isAuthenticated,
}: {
  option: DepartmentCompareOption;
  isAuthenticated: boolean;
}) {
  const [selected, setSelected] = useState<DepartmentCompareOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const compareUrl = buildCompareUrl(
    option.specialtyId,
    selected.length > 0 ? selected : [option],
  );
  const isSelected = selected.some((item) => item.id === option.id);

  useEffect(() => {
    setSelected(
      readStoredSelection(option.specialtyId)
        .filter((item): item is DepartmentCompareOption =>
          Boolean(item?.id && item?.specialtyId === option.specialtyId),
        )
        .slice(0, MAX_COMPARE_ITEMS),
    );
  }, [option.specialtyId]);

  function addToComparison() {
    setMessage(null);

    if (isSelected) {
      setMessage("העמוד כבר נוסף להשוואה.");
      return;
    }

    if (selected.length >= MAX_COMPARE_ITEMS) {
      setMessage("ניתן להשוות עד 4 מחלקות בכל פעם.");
      return;
    }

    const nextSelection = [...selected, option];
    setSelected(nextSelection);
    writeStoredSelection(option.specialtyId, nextSelection);

    setMessage("נוסף להשוואה.");
  }

  function openComparison() {
    if (!isAuthenticated) {
      setMessage("כדי לצפות בהשוואה יש להתחבר או להירשם.");
      router.push(`/login?next=${encodeURIComponent(compareUrl)}`);
      return;
    }

    router.push(compareUrl);
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addToComparison}
          className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-black text-brand-900 transition hover:bg-brand-100"
        >
          {isSelected ? "נוסף להשוואה" : "הוספה להשוואה"}
        </button>
        <button
          type="button"
          onClick={openComparison}
          className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-black text-white transition hover:bg-brand-800"
        >
          צפייה בהשוואה
        </button>
      </div>
      {message ? (
        <p role="status" className="mt-2 text-xs font-bold text-amber-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
