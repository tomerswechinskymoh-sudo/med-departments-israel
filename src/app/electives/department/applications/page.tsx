import type { Metadata } from "next";
import Link from "next/link";
import { ElectiveApplicationStatus } from "@prisma/client";
import { ElectiveDepartmentLogoutButton } from "@/components/electives/department-portal-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSelectedElectiveDepartment, requireElectiveDepartmentSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function ElectiveDepartmentApplicationsPage({ searchParams }: { searchParams?: Promise<{ departmentId?: string; status?: string }> }) {
  const session = await requireElectiveDepartmentSession();
  const params = await searchParams;
  const selectedDepartment = getSelectedElectiveDepartment(session, params?.departmentId) ?? session.assignedDepartments[0];
  const status = params?.status && Object.values(ElectiveApplicationStatus).includes(params.status as ElectiveApplicationStatus)
    ? params.status as ElectiveApplicationStatus
    : undefined;
  const applications = await prisma.electiveApplication.findMany({
    where: {
      departmentId: selectedDepartment.id,
      ...(status ? { status } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <PageShell className="space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          eyebrow="Private department portal"
          title="מועמדויות אלקטיב"
          description={`${selectedDepartment.institutionName} · ${selectedDepartment.specialtyName}. מוצגות רק מחלקות שהוקצו לחשבון.`}
        />
        <div className="flex flex-wrap gap-2">
          <Link href={`/electives/department?departmentId=${selectedDepartment.id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">
            חזרה
          </Link>
          <ElectiveDepartmentLogoutButton />
        </div>
      </div>

      {session.assignedDepartments.length > 1 ? (
        <Card className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-500">בחירת מחלקה</span>
          {session.assignedDepartments.map((department) => (
            <Link
              key={department.id}
              href={`/electives/department/applications?departmentId=${department.id}`}
              className={`rounded-full px-4 py-2 text-xs font-black ${
                department.id === selectedDepartment.id ? "bg-brand-700 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {department.institutionName} · {department.specialtyName}
            </Link>
          ))}
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">בקשות לטיפול</h2>
          <Badge tone="warning">{applications.length} מוצגות</Badge>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">סטודנט/ית</th>
                <th className="px-3 py-2">תאריכים</th>
                <th className="px-3 py-2">סטטוס</th>
                <th className="px-3 py-2">נוצר</th>
                <th className="px-3 py-2">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{application.applicantName}</p>
                    <p className="text-xs text-slate-500">{application.applicantEmail}</p>
                  </td>
                  <td className="px-3 py-3">
                    {application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין"}
                    {" - "}
                    {application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין"}
                  </td>
                  <td className="px-3 py-3"><Badge tone="default">{application.status}</Badge></td>
                  <td className="px-3 py-3">{formatDate(application.createdAt)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/electives/department/applications/${application.id}`} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white">
                      פתיחה
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {applications.length === 0 ? <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין מועמדויות במחלקה זו.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
