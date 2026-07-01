import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ElectivesDemoTools } from "@/components/admin/admin-demo-actions";
import {
  ElectiveAvailabilityWindowForm,
  ElectiveDepartmentAccountForm,
  ElectiveDepartmentSettingsForm
} from "@/components/admin/electives-admin-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
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

function applicationStatusCounts(applications: Array<{ status: string }>) {
  return applications.reduce<Record<string, number>>((accumulator, application) => {
    accumulator[application.status] = (accumulator[application.status] ?? 0) + 1;
    return accumulator;
  }, {});
}

export default async function AdminElectiveDepartmentDetailPage({
  params
}: {
  params: Promise<{ departmentId: string }>;
}) {
  await requireAdmin();
  const { departmentId } = await params;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      institution: { select: { name: true } },
      specialty: { select: { name: true } },
      electiveDepartmentAccount: true,
      electiveSettings: true,
      electiveAvailabilityWindows: {
        orderBy: { startsAt: "desc" },
        take: 20
      },
      electiveApplications: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!department) {
    notFound();
  }

  const option = [{ id: department.id, label: departmentLabel(department) }];
  const applicationCounts = applicationStatusCounts(department.electiveApplications);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title={departmentLabel(department)}
        description="ניהול אלקטיב למחלקה אחת. הנתונים אינם מוצגים לציבור."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">חשבון מחלקה</h2>
            <Badge tone={department.electiveDepartmentAccount?.isActive ? "success" : "warning"}>
              {department.electiveDepartmentAccount ? "קיים" : "חסר"}
            </Badge>
          </div>
          <div className="mt-5">
            <ElectiveDepartmentAccountForm
              departments={option}
              initialDepartmentId={department.id}
              initialAccount={
                department.electiveDepartmentAccount
                  ? {
                      username: department.electiveDepartmentAccount.username,
                      isActive: department.electiveDepartmentAccount.isActive
                    }
                  : null
              }
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">הגדרות אלקטיב</h2>
            <Badge tone={department.electiveSettings ? "success" : "warning"}>{department.electiveSettings ? "קיים" : "חסר"}</Badge>
          </div>
          <div className="mt-5">
            <ElectiveDepartmentSettingsForm
              departments={option}
              initialDepartmentId={department.id}
              initialSettings={
                department.electiveSettings
                  ? {
                      maxStudentsAtOnce: department.electiveSettings.maxStudentsAtOnce,
                      availabilityMode: department.electiveSettings.availabilityMode,
                      contactEmail: department.electiveSettings.contactEmail,
                      contactPhone: department.electiveSettings.contactPhone,
                      instructions: department.electiveSettings.instructions,
                      adminNotes: department.electiveSettings.adminNotes
                    }
                  : null
              }
            />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-black text-ink">QA / דמו למחלקה זו</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          יצירת דמו מלא או איפוס סיסמה זמנית לחשבון המחלקה. הסיסמה מוצגת פעם אחת בלבד.
        </p>
        <div className="mt-5">
          <ElectivesDemoTools departments={option} />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">חלונות זמינות</h2>
        <div className="mt-5">
          <ElectiveAvailabilityWindowForm departments={option} initialDepartmentId={department.id} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {department.electiveAvailabilityWindows.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין חלונות זמינות.</p>
          ) : (
            department.electiveAvailabilityWindows.map((window) => (
              <div key={window.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={window.status === "OPEN" ? "success" : "danger"}>{window.status === "OPEN" ? "פתוח" : "סגור"}</Badge>
                  <span className="font-semibold text-ink">
                    {formatDate(window.startsAt)} - {formatDate(window.endsAt)}
                  </span>
                </div>
                {window.note ? <p className="mt-2 text-slate-600">{window.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">מועמדויות אחרונות</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(applicationCounts).map(([status, count]) => (
              <Badge key={status} tone="default">
                {status}: {count}
              </Badge>
            ))}
            {department.electiveApplications.length === 0 ? <Badge tone="warning">אין מועמדויות</Badge> : null}
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">שם</th>
                <th className="px-3 py-2">אימייל</th>
                <th className="px-3 py-2">תאריכים</th>
                <th className="px-3 py-2">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {department.electiveApplications.map((application) => (
                <tr key={application.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-semibold text-ink">{application.applicantName}</td>
                  <td className="px-3 py-3">{application.applicantEmail}</td>
                  <td className="px-3 py-3">
                    {application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין"}
                    {" - "}
                    {application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין"}
                  </td>
                  <td className="px-3 py-3"><Badge tone="default">{application.status}</Badge></td>
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
