"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type DepartmentCompareOption = {
  id: string;
  name: string;
  institutionName: string;
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
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(specialtyId)) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredSelection(specialtyId: string, selected: DepartmentCompareOption[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(storageKey(specialtyId), JSON.stringify(selected));
}

function buildCompareUrl(specialtyId: string, selected: DepartmentCompareOption[]) {
  const params = new URLSearchParams();
  params.set("specialty", specialtyId);
  params.set("departments", selected.map((item) => item.id).join(","));

  return `/compare?${params.toString()}`;
}

function useCompareContext() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("Department comparison controls must be rendered inside DepartmentCompareProvider.");
  }

  return context;
}

export function DepartmentCompareProvider({
  specialtyId,
  isAuthenticated,
  children
}: {
  specialtyId: string;
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<DepartmentCompareOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = readStoredSelection(specialtyId)
      .filter((item): item is DepartmentCompareOption =>
        Boolean(item?.id && item?.specialtyId === specialtyId)
      )
      .slice(0, MAX_COMPARE_ITEMS);
    setSelected(stored);
  }, [specialtyId]);

  useEffect(() => {
    writeStoredSelection(specialtyId, selected);
  }, [selected, specialtyId]);

  const compareUrl = useMemo(() => buildCompareUrl(specialtyId, selected), [selected, specialtyId]);

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

        setSelected((current) => {
          if (current.some((item) => item.id === option.id)) {
            return current.filter((item) => item.id !== option.id);
          }

          if (current.length >= MAX_COMPARE_ITEMS) {
            setMessage("ניתן להשוות עד 4 מחלקות בכל פעם.");
            return current;
          }

          return [...current, option];
        });
      },
      clear: () => {
        setSelected([]);
        setMessage(null);
      }
    }),
    [compareUrl, isAuthenticated, message, selected, specialtyId]
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
      <div className="space-y-4">
        {children}
        <div className="sticky bottom-4 z-50 rounded-[1.25rem] border border-brand-100 bg-white/96 px-4 py-3 shadow-panel backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-ink">
                נבחרו {selected.length}/{MAX_COMPARE_ITEMS} להשוואה
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                ההשוואה נשמרת זמנית לתחום ההתמחות הנוכחי.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={value.clear}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                ניקוי
              </button>
              <button
                type="button"
                onClick={openComparison}
                className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-800"
              >
                השוואת מחלקות
              </button>
            </div>
          </div>
          {message ? <p className="mt-2 text-xs font-bold text-amber-700">{message}</p> : null}
          {!isAuthenticated ? (
            <p className="mt-2 text-xs text-slate-500">
              כדי לצפות בטבלת ההשוואה יש להתחבר או להירשם.
            </p>
          ) : null}
          {pathname === "/compare" ? (
            <Link href="/departments" className="mt-2 inline-flex text-xs font-bold text-brand-700">
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
  children
}: {
  option: DepartmentCompareOption;
  children: ReactNode;
}) {
  const comparison = useCompareContext();
  const selected = comparison.isSelected(option.id);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          comparison.toggle(option);
        }}
        className={`absolute left-3 top-3 z-40 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black shadow-sm transition ${
          selected
            ? "border-brand-300 bg-brand-700 text-white"
            : "border-slate-200 bg-white/95 text-slate-700 hover:border-brand-200 hover:text-brand-800"
        }`}
        aria-pressed={selected}
        title="בחירה להשוואה"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[0.65rem]">
          {selected ? "✓" : "+"}
        </span>
        להשוואה
      </button>
      {children}
    </div>
  );
}

export function DepartmentCompareProfileButton({
  option,
  isAuthenticated
}: {
  option: DepartmentCompareOption;
  isAuthenticated: boolean;
}) {
  const [selected, setSelected] = useState<DepartmentCompareOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const compareUrl = buildCompareUrl(option.specialtyId, selected.length > 0 ? selected : [option]);
  const isSelected = selected.some((item) => item.id === option.id);

  useEffect(() => {
    setSelected(
      readStoredSelection(option.specialtyId)
        .filter((item): item is DepartmentCompareOption =>
          Boolean(item?.id && item?.specialtyId === option.specialtyId)
        )
        .slice(0, MAX_COMPARE_ITEMS)
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
          className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-black text-brand-900 transition hover:bg-brand-100"
        >
          {isSelected ? "נוסף להשוואה" : "הוספה להשוואה"}
        </button>
        <button
          type="button"
          onClick={openComparison}
          className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white transition hover:bg-brand-800"
        >
          צפייה בהשוואה
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-bold text-amber-700">{message}</p> : null}
    </div>
  );
}
