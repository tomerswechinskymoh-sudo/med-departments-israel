import { ProductIcon } from "@/components/ui/product-icon";
import type { CSSProperties } from "react";
export const metadata = { robots: { index: false, follow: false } };
import { PageIntro } from "@/components/ui/page-intro";

import { ComparisonRemove } from "@/components/departments/comparison-remove";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDepartmentComparisonData, getDepartmentOptions } from "@/lib/queries";
import { LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL } from "@/lib/metric-display";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { InstitutionLogo } from "@/components/departments/institution-logo";

const comparisonColumns = [
  "מחלקה / מערך",
  "בית חולים",
  "משך התמחות ממוצע בפועל (שנים)",
  "טווח מתמחים חדשים צפוי ב-2026",
  LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL,
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
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session] = await Promise.all([searchParams, getSession()]);
  const departments = parseDepartmentIds(params.departments);
  const specialtyId =
    typeof params.specialty === "string" ? params.specialty : undefined;
  const options = session ? await getDepartmentOptions() : [];
  const comparison = session
    ? await getDepartmentComparisonData({
        departmentIds: departments,
        specialtyId,
      })
    : null;

  if (!session) {
    const next = `/compare?${new URLSearchParams({
      ...(specialtyId ? { specialty: specialtyId } : {}),
      departments: departments.join(","),
    }).toString()}`;

    return (
      <PageShell className="py-8">
        <Card className="mx-auto max-w-2xl rounded-2xl text-center">
          <p className="text-sm font-black text-brand-700">גישה להשוואה</p>
          <h1 className="mt-3 text-3xl font-black text-ink">
            כדי לצפות בהשוואה יש להתחבר או להירשם.
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            אפשר לבחור מחלקות בחיפוש גם בלי חשבון, אבל טבלת ההשוואה זמינה
            למשתמשים רשומים.
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
          <h1 className="text-3xl font-black text-ink">
            לא נבחרו מחלקות להשוואה
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            חזרו לחיפוש ובחרו עד 4 מחלקות או מערכים.
          </p>
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
          <h1 className="text-3xl font-black text-ink">
            ניתן להשוות מחלקות רק בתוך אותו תחום התמחות.
          </h1>
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
    <PageShell className="compare-page space-y-6">
      <PageIntro
        eyebrow="השוואת מחלקות"
        title="השוואת מחלקות"
        image="corridor"
        description="אותן הגדרות, מבט אחד. השוו בין המחלקות שבחרתם ובדקו את המקורות בפרופיל המלא."
      />

      <div className="compare-selection-bar">
        <div>
          <p className="mb-3 text-sm">
            {comparison.rows.length} מחלקות נבחרו · עד ארבע מחלקות מאותו תחום
          </p>
          <div className="compare-selection-chips">
            {comparison.rows.map((row) => (
              <span key={row.id}>
                <InstitutionLogo institution={{name: row.hospitalName, slug: row.hospitalSlug}} size="sm" />
                <span>
                  <strong>{row.hospitalName}</strong>
                  <small>{row.name}</small>
                </span>
              </span>
            ))}
          </div>
        </div>
        <Link
          href={
            specialtyId
              ? `/departments?specialty=${encodeURIComponent(specialtyId)}`
              : "/departments"
          }
          className="button-link secondary"
        >
          הוספת מחלקה +
        </Link>
      </div>
      <Card className="!p-0">
        <p
          id="comparison-note"
          className="p-4 text-sm leading-7 text-slate-600"
        >
          אין נתון אינו אפס. נתוני מערך מסומנים כממוצע למחלקה; אין כאן דירוג
          כולל של איכות המחלקות.
        </p>
        <p className="px-4 pb-3 text-sm text-brand-800 sm:hidden">
          החליקו בתוך הטבלה כדי לראות מחלקות נוספות.
        </p>
        <div
          className="comparison-scroll"
          role="region"
          aria-label="טבלת השוואת מחלקות — ניתנת לגלילה אופקית"
          tabIndex={0}
        >
          <table
            className="comparison-table"
            aria-describedby="comparison-note"
            style={
              {
                "--comparison-columns": comparison.rows.length,
              } as CSSProperties
            }
          >
            <caption className="sr-only">השוואת מחלקות שנבחרו</caption>
            <thead>
              <tr>
                <th scope="col">מדד להשוואה</th>
                {comparison.rows.map((row) => (
                  <th scope="col" key={row.id}>
                    <span className="compare-institution-mark">
                      <InstitutionLogo institution={{name: row.hospitalName, slug: row.hospitalSlug}} size="sm" />
                    </span>
                    <p className="text-lg font-bold">{row.hospitalName}</p>
                    <p className="mt-2 font-normal">{row.name}</p>
                    {row.isArray && (
                      <p className="mt-2 text-xs">
                        ממוצע למחלקה במערך · {row.arrayDepartmentCount} מחלקות
                      </p>
                    )}
                    <ComparisonRemove
                      id={row.id}
                      ids={comparison.rows.map((r) => r.id)}
                      specialtyId={row.specialtyId}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "משך התמחות ממוצע בפועל (שנים)",
                  field: "actualDuration",
                },
                {
                  label: "טווח מתמחים חדשים צפוי ב־2026",
                  field: "expectedOpenings2026",
                },
                {
                  label: LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL,
                  field: "medianWaitingTime",
                },
              ].map((metric) => (
                <tr key={metric.field}>
                  <th scope="row">{metric.label}</th>
                  {comparison.rows.map((row) => (
                    <td key={row.id}>
                      {String(
                        row[
                          metric.field as
                            | "actualDuration"
                            | "expectedOpenings2026"
                            | "medianWaitingTime"
                        ] ?? "אין נתון",
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">להעמקה</th>
                {comparison.rows.map((row) => (
                  <td key={row.id}>
                    <Link
                      className="text-link"
                      href={options.find(option => option.id === row.id) ? `/departments/${encodeURIComponent(options.find(option => option.id === row.id)!.slug)}?departmentId=${encodeURIComponent(row.id)}` : "/departments"}
                    >
                      לפרופיל המחלקה ←
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-sm leading-7 text-slate-600">
        נתוני ההשוואה מוצגים לפי מקורותיהם והגדרותיהם הקיימות. לא מוצגים כאן
        ציונים, שיעורי מעבר או חוות דעת שאין להם נתון מתאים.{" "}
        <Link
          className="underline"
          href="/career-fit/methodology#department-index"
        >
          על מגבלות מדד המחלקה
        </Link>
      </p>
    </PageShell>
  );
}
