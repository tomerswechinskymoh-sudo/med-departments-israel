import type { Metadata } from "next";
import { ElectiveApplicationStatus } from "@prisma/client";
import { ElectivesDemoTools } from "@/components/admin/admin-demo-actions";
import { ElectiveApplicationAdminForm, ElectiveApplicationStatusForm } from "@/components/admin/electives-admin-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { getElectiveTrackLabel } from "@/lib/elective-tracks";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

function departmentLabel(department: {
  name: string;
  institution: { name: string };
  specialty: { name: string };
}) {
  return `${department.institution.name} · ${department.specialty.name} · ${department.name}`;
}

function statusCounts(applications: Array<{ status: string }>) {
  return applications.reduce<Record<string, number>>((accumulator, application) => {
    accumulator[application.status] = (accumulator[application.status] ?? 0) + 1;
    return accumulator;
  }, {});
}

export default async function AdminElectiveApplicationsPage({ searchParams }: { searchParams?: Promise<{ departmentId?: string; status?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = params?.status && Object.values(ElectiveApplicationStatus).includes(params.status as ElectiveApplicationStatus)
    ? params.status as ElectiveApplicationStatus
    : undefined;

  const [departments, applications] = await Promise.all([
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } }
      },
      orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }]
    }),
    prisma.electiveApplication.findMany({
      where: {
        ...(params?.departmentId ? { departmentId: params.departmentId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        department: {
          select: {
            name: true,
            institution: { select: { name: true } },
            specialty: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    label: departmentLabel(department)
  }));
  const applicationCounts = statusCounts(applications);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="מועמדויות אלקטיב"
        description="תצוגה פנימית להכנת המודל. אין עדיין טופס סטודנטים ציבורי."
      />

      <Card>
        <h2 className="text-xl font-black text-ink">הוספת מועמדות אדמין</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">משמש לבדיקה וניהול פנימי בלבד.</p>
        <div className="mt-5">
          <ElectiveApplicationAdminForm
            departments={departmentOptions}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">QA / דמו פנימי</h2>
        <div className="mt-5">
          {departmentOptions.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין מחלקות זמינות לנתוני דמו.</p>
          ) : (
            <ElectivesDemoTools departments={departmentOptions} />
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">מועמדויות אחרונות</h2>
          <div className="flex flex-wrap gap-2">
            <Badge tone="default">{applications.length} מוצגות</Badge>
            {Object.entries(applicationCounts).map(([status, count]) => (
              <Badge key={status} tone="default">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>
        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin/electives/applications">
          <select name="departmentId" defaultValue={params?.departmentId ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">כל המחלקות</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>{department.label}</option>
            ))}
          </select>
          <select name="status" defaultValue={params?.status ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">כל הסטטוסים</option>
            {Object.keys(applicationCounts).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">סינון</button>
        </form>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">סטודנט/ית</th>
                <th className="px-3 py-2">מחלקה</th>
                <th className="px-3 py-2">תאריכים</th>
                <th className="px-3 py-2">סוג סבב</th>
                <th className="px-3 py-2">סטטוס</th>
                <th className="px-3 py-2">עדכון סטטוס</th>
                <th className="px-3 py-2">נוצר</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{application.applicantName}</p>
                    <p className="text-xs text-slate-500">{application.applicantEmail}</p>
                  </td>
                  <td className="px-3 py-3">{departmentLabel(application.department)}</td>
                  <td className="px-3 py-3">
                    {application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין"}
                    {" - "}
                    {application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין"}
                  </td>
                  <td className="px-3 py-3">{getElectiveTrackLabel(application.trackType)}</td>
                  <td className="px-3 py-3"><Badge tone="default">{application.status}</Badge></td>
                  <td className="px-3 py-3">
                    <ElectiveApplicationStatusForm applicationId={application.id} initialStatus={application.status} />
                  </td>
                  <td className="px-3 py-3">{formatDate(application.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {applications.length === 0 ? <p className="mt-4 text-sm text-slate-600">אין מועמדויות.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
