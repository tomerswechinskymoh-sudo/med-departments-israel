import type { Metadata } from "next";
import { ElectiveApplicationAdminForm } from "@/components/admin/electives-admin-forms";
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

export default async function AdminElectiveApplicationsPage() {
  await requireAdmin();

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
            departments={departments.map((department) => ({
              id: department.id,
              label: departmentLabel(department)
            }))}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">מועמדויות אחרונות</h2>
          <Badge tone="default">{applications.length} מוצגות</Badge>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">סטודנט/ית</th>
                <th className="px-3 py-2">מחלקה</th>
                <th className="px-3 py-2">תאריכים</th>
                <th className="px-3 py-2">סטטוס</th>
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
                  <td className="px-3 py-3"><Badge tone="default">{application.status}</Badge></td>
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
