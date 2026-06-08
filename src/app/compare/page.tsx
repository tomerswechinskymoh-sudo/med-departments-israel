import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDepartmentComparisonData } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const comparisonColumns = [
  "מחלקה / מערך",
  "בית חולים",
  "משך התמחות ממוצע בפועל (שנים)",
  "טווח מתמחים חדשים צפוי ב-2026",
  "זמן המתנה חציוני למשרה (חודשים)"
] as const;

function parseDepartmentIds(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return (rawValue ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export default async function ComparePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session] = await Promise.all([searchParams, getSession()]);
  const departments = parseDepartmentIds(params.departments);
  const specialtyId = typeof params.specialty === "string" ? params.specialty : undefined;
  const comparison = session
    ? await getDepartmentComparisonData({ departmentIds: departments, specialtyId })
    : null;

  if (!session) {
    const next = `/compare?${new URLSearchParams({
      ...(specialtyId ? { specialty: specialtyId } : {}),
      departments: departments.join(",")
    }).toString()}`;

    return (
      <PageShell className="py-8">
        <Card className="mx-auto max-w-2xl rounded-2xl text-center">
          <p className="text-sm font-black text-brand-700">גישה להשוואה</p>
          <h1 className="mt-3 text-3xl font-black text-ink">כדי לצפות בהשוואה יש להתחבר או להירשם.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            אפשר לבחור מחלקות בחיפוש גם בלי חשבון, אבל טבלת ההשוואה זמינה למשתמשים רשומים.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white"
            >
              התחברות
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-black text-brand-800"
            >
              הרשמה
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!comparison || comparison.status === "empty") {
    return (
      <PageShell className="py-8">
        <Card className="mx-auto max-w-2xl rounded-2xl text-center">
          <h1 className="text-3xl font-black text-ink">לא נבחרו מחלקות להשוואה</h1>
          <p className="mt-3 text-sm text-slate-600">חזרו לחיפוש ובחרו עד 4 מחלקות או מערכים.</p>
          <Link
            href="/departments"
            className="mt-6 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white"
          >
            חיפוש מחלקות
          </Link>
        </Card>
      </PageShell>
    );
  }

  if (comparison.status === "mixed-specialty") {
    return (
      <PageShell className="py-8">
        <Card className="mx-auto max-w-2xl rounded-2xl text-center">
          <h1 className="text-3xl font-black text-ink">ניתן להשוות מחלקות רק בתוך אותו תחום התמחות.</h1>
          <p className="mt-3 text-sm text-slate-600">
            בחרו מחלקות מתוך אותו תחום התמחות וחזרו לטבלת ההשוואה.
          </p>
          <Link
            href="/departments"
            className="mt-6 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white"
          >
            חזרה לחיפוש
          </Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f7fa]">
      <PageShell className="space-y-5 py-6">
        <section className="rounded-2xl border border-brand-100 bg-white/95 p-5 shadow-sm">
          <p className="text-sm font-black text-brand-700">השוואת מחלקות</p>
          <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
            השוואה בתחום {comparison.specialtyName ?? "ההתמחות"}
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            מוצגות עד 4 מחלקות או מערכים מאותו תחום. נתוני מערך מסומנים כממוצע למחלקה במערך.
          </p>
        </section>

        <Card className="rounded-2xl !p-0">
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  {comparisonColumns.map((column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.rows.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-4 py-4">
                      <p className="font-black text-ink">{row.name}</p>
                      {row.isArray ? (
                        <p className="mt-1 text-xs font-bold text-brand-700">
                          ממוצע למחלקה במערך · {row.arrayDepartmentCount} מחלקות
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-700">{row.hospitalName}</td>
                    <td className="px-4 py-4">{row.actualDuration}</td>
                    <td className="px-4 py-4">
                      <span>{row.expectedOpenings2026}</span>
                      {row.isArray ? <span className="block text-xs font-bold text-slate-500">ממוצע למחלקה במערך</span> : null}
                    </td>
                    <td className="px-4 py-4">{row.medianWaitingTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 lg:hidden">
            {comparison.rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-100 bg-white px-4 py-4">
                <p className="text-lg font-black text-ink">{row.name}</p>
                <p className="mt-1 text-sm font-bold text-slate-600">{row.hospitalName}</p>
                {row.isArray ? (
                  <p className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-800">
                    ממוצע למחלקה במערך · {row.arrayDepartmentCount} מחלקות
                  </p>
                ) : null}
                <div className="mt-4 grid gap-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-500">משך התמחות ממוצע בפועל</p>
                    <p className="mt-1 font-black text-ink">{row.actualDuration}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-500">טווח מתמחים חדשים צפוי ב-2026</p>
                    <p className="mt-1 font-black text-ink">{row.expectedOpenings2026}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-500">זמן המתנה חציוני למשרה</p>
                    <p className="mt-1 font-black text-ink">{row.medianWaitingTime}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageShell>
    </div>
  );
}
