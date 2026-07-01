import type { Metadata } from "next";
import Link from "next/link";
import { ElectivesDemoTools } from "@/components/admin/admin-demo-actions";
import { ElectiveDepartmentAccountForm, ElectiveDepartmentSettingsForm } from "@/components/admin/electives-admin-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

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
  const counts = applications.reduce<Record<string, number>>((accumulator, application) => {
    accumulator[application.status] = (accumulator[application.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(" · ");
}

export default async function AdminElectiveDepartmentsPage() {
  await requireAdmin();

  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      institution: { select: { name: true } },
      specialty: { select: { name: true } },
      electiveDepartmentAccount: true,
      electiveSettings: true,
      electiveApplications: {
        select: { status: true }
      },
      _count: {
        select: {
          electiveAvailabilityWindows: true,
          electiveApplications: true
        }
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }]
  });
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    label: departmentLabel(department)
  }));

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="מחלקות אלקטיב"
        description="יצירת חשבונות מחלקה ושמירת הגדרות ראשוניות. הסיסמה נשמרת כ-hash בלבד."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black text-ink">יצירה / עדכון חשבון מחלקה</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">החשבון מיועד לשלב עתידי שבו נציג מחלקה ינהל רק את המחלקה שלו.</p>
          <div className="mt-5">
            <ElectiveDepartmentAccountForm departments={departmentOptions} />
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-ink">הגדרות אלקטיב למחלקה</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">מקסימום סטודנטים במקביל ומצב זמינות בסיסי.</p>
          <div className="mt-5">
            <ElectiveDepartmentSettingsForm departments={departmentOptions} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-black text-ink">QA / דמו פנימי</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          יוצר נתוני דמו במחלקה נבחרת ומציג סיסמה זמנית רק פעם אחת לאחר יצירה/איפוס.
        </p>
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
          <div>
            <h2 className="text-xl font-black text-ink">סטטוס מחלקות</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">רשימת אדמין בלבד. אין חשיפה ציבורית.</p>
          </div>
          <Badge tone="default">{departments.length} מחלקות</Badge>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">מחלקה</th>
                <th className="px-3 py-2">חשבון</th>
                <th className="px-3 py-2">מקסימום</th>
                <th className="px-3 py-2">זמינות</th>
                <th className="px-3 py-2">חלונות</th>
                <th className="px-3 py-2">מועמדויות לפי סטטוס</th>
                <th className="px-3 py-2">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {departments.slice(0, 200).map((department) => (
                <tr key={department.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-semibold text-ink">{departmentLabel(department)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={department.electiveDepartmentAccount?.isActive ? "success" : "default"}>
                      {department.electiveDepartmentAccount
                        ? department.electiveDepartmentAccount.isActive
                          ? "פעיל"
                          : "לא פעיל"
                        : "חסר"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{department.electiveSettings?.maxStudentsAtOnce ?? "לא הוגדר"}</td>
                  <td className="px-3 py-3">
                    <Badge tone={department.electiveSettings ? "success" : "warning"}>
                      {department.electiveSettings?.availabilityMode ?? "חסר"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{department._count.electiveAvailabilityWindows}</td>
                  <td className="px-3 py-3">
                    {department.electiveApplications.length > 0 ? applicationStatusCounts(department.electiveApplications) : "אין"}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/electives/departments/${department.id}`} className="font-black text-brand-800">
                      פתיחה
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {departments.length === 0 ? <p className="mt-4 text-sm text-slate-600">אין מחלקות להצגה.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
