import type { Metadata } from "next";
import Link from "next/link";
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

export default async function ElectiveDepartmentPortalPage({ searchParams }: { searchParams?: Promise<{ departmentId?: string }> }) {
  const session = await requireElectiveDepartmentSession();
  const selectedDepartment = getSelectedElectiveDepartment(session, (await searchParams)?.departmentId) ?? session.assignedDepartments[0];
  const department = await prisma.department.findUnique({
    where: { id: selectedDepartment.id },
    include: {
      electiveDepartmentAccount: true,
      electiveSettings: true,
      electiveAvailabilityWindows: {
        orderBy: { startsAt: "asc" },
        take: 8
      },
      electiveApplications: {
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });

  if (!department) {
    return null;
  }

  return (
    <PageShell className="space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          eyebrow="Private department portal"
          title={`${selectedDepartment.institutionName} · ${selectedDepartment.specialtyName}`}
          description="ניהול אלקטיבים פרטי למחלקות שהוקצו לחשבון. אין חשיפה בניווט הציבורי."
        />
        <ElectiveDepartmentLogoutButton />
      </div>

      {session.assignedDepartments.length > 1 ? (
        <Card className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-500">מחלקות בניהולך</span>
          {session.assignedDepartments.map((assigned) => (
            <Link
              key={assigned.id}
              href={`/electives/department?departmentId=${assigned.id}`}
              className={`rounded-full px-4 py-2 text-xs font-black ${
                assigned.id === selectedDepartment.id ? "bg-brand-700 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {assigned.institutionName} · {assigned.specialtyName}
            </Link>
          ))}
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs font-black text-slate-500">סטטוס חשבון</p>
          <p className="mt-2 text-xl font-black text-ink">{department.electiveDepartmentAccount?.isActive ? "פעיל" : "לא פעיל"}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">מקסימום במקביל</p>
          <p className="mt-2 text-xl font-black text-ink">{department.electiveSettings?.maxStudentsAtOnce ?? "לא הוגדר"}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">זמינות בסיסית</p>
          <p className="mt-2 text-xl font-black text-ink">{department.electiveSettings?.availabilityMode ?? "לא הוגדר"}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">מועמדויות ציבוריות</p>
          <p className="mt-2 text-xl font-black text-ink">{department.electiveSettings?.allowApplications ? "מוכן לפתיחה" : "סגור"}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">הגדרות מחלקה</h2>
            <Link href={`/electives/department/settings?departmentId=${selectedDepartment.id}`} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white">
              עריכה
            </Link>
          </div>
          <dl className="mt-4 grid gap-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">משך אלקטיב</dt>
              <dd className="mt-1 font-semibold">
                {department.electiveSettings?.minDurationDays ?? "?"} - {department.electiveSettings?.maxDurationDays ?? "?"} ימים
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">הנחיות</dt>
              <dd className="mt-1 leading-7">{department.electiveSettings?.instructions ?? "לא הוגדרו הנחיות."}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">חלונות זמינות קרובים</h2>
            <Link href={`/electives/department/availability?departmentId=${selectedDepartment.id}`} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white">
              ניהול
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {department.electiveAvailabilityWindows.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין חלונות זמינות.</p>
            ) : (
              department.electiveAvailabilityWindows.map((window) => (
                <div key={window.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={window.status === "OPEN" ? "success" : "danger"}>{window.status}</Badge>
                    <span className="font-semibold text-ink">
                      {formatDate(window.startsAt)} - {formatDate(window.endsAt)}
                    </span>
                  </div>
                  {window.reason ? <p className="mt-2 text-slate-600">{window.reason}</p> : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">מועמדויות אחרונות</h2>
          <Link href={`/electives/department/applications?departmentId=${selectedDepartment.id}`} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white">
            ניהול מועמדויות
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">שם</th>
                <th className="px-3 py-2">תאריכים</th>
                <th className="px-3 py-2">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {department.electiveApplications.map((application) => (
                <tr key={application.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-semibold text-ink">{application.applicantName}</td>
                  <td className="px-3 py-3">
                    {application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין"}
                    {" - "}
                    {application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין"}
                  </td>
                  <td className="px-3 py-3">{application.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {department.electiveApplications.length === 0 ? <p className="mt-4 text-sm text-slate-600">אין מועמדויות.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
