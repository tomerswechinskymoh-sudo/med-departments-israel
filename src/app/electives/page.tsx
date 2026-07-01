import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getAvailabilitySummary,
  getElectiveDepartmentRegion,
  listElectiveDepartments,
  requireStudentElectivesPreviewEnabled
} from "@/lib/student-electives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function StudentElectivesPreviewPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; specialty?: string; region?: string }>;
}) {
  requireStudentElectivesPreviewEnabled();
  const params = await searchParams;
  const departments = await listElectiveDepartments(params);
  const specialties = Array.from(new Set(departments.map((department) => department.specialty.name))).sort();
  const regions = Array.from(new Set(departments.map((department) => getElectiveDepartmentRegion(department)))).sort();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Private preview"
        title="אלקטיבים למחלקות"
        description="תצוגת Preview פרטית. מחלקות מופיעות רק אם נפתחה אפשרות להגשת מועמדות. אין קישור ציבורי בניווט או במפת האתר."
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-4" action="/electives">
          <input
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="חיפוש מחלקה, בית חולים או תחום"
            className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none md:col-span-2"
          />
          <select name="specialty" defaultValue={params.specialty ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">כל התחומים</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
          <select name="region" defaultValue={params.region ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">כל האזורים</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white md:col-span-4">סינון</button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((department) => {
          const region = getElectiveDepartmentRegion(department);

          return (
            <Card key={department.id} className="flex h-full flex-col justify-between gap-5">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">פתוח להגשה</Badge>
                  <Badge tone="default">{department.electiveSettings?.availabilityMode ?? "לא הוגדר"}</Badge>
                </div>
                <div className="mt-4 flex gap-3">
                  <InstitutionLogo institution={department.institution} size="sm" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-ink">{department.institution.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{department.specialty.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[department.institution.city, region].filter(Boolean).join(" · ") || "מיקום לא צוין"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{getAvailabilitySummary(department)}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  מקסימום במקביל: {department.electiveSettings?.maxStudentsAtOnce ?? "לא הוגדר"}
                </p>
              </div>
              <Link href={`/electives/${department.slug}`} className="inline-flex w-fit rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
                צפייה בפרטי אלקטיב
              </Link>
            </Card>
          );
        })}
      </div>

      {departments.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">אין מחלקות פתוחות להגשת אלקטיב בתצוגת ה-Preview כרגע.</p>
        </Card>
      ) : null}
    </PageShell>
  );
}
