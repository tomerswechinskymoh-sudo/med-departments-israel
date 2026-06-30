import type { Metadata } from "next";
import { ElectiveAvailabilityWindowForm, ElectiveDepartmentSettingsForm } from "@/components/admin/electives-admin-forms";
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

export default async function AdminElectiveSettingsPage() {
  await requireAdmin();

  const [departments, settings, windows] = await Promise.all([
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } }
      },
      orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }]
    }),
    prisma.electiveDepartmentSettings.findMany({
      include: {
        department: {
          select: {
            name: true,
            institution: { select: { name: true } },
            specialty: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.electiveAvailabilityWindow.findMany({
      include: {
        department: {
          select: {
            name: true,
            institution: { select: { name: true } },
            specialty: { select: { name: true } }
          }
        }
      },
      orderBy: { startsAt: "desc" },
      take: 100
    })
  ]);
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    label: departmentLabel(department)
  }));

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="הגדרות אלקטיבים וחלונות זמינות"
        description="ניהול פנימי בלבד. בהמשך זה יהיה הבסיס להרשאות נציגי מחלקה."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black text-ink">הגדרת מחלקה</h2>
          <div className="mt-5">
            <ElectiveDepartmentSettingsForm departments={departmentOptions} />
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-ink">חלון זמינות</h2>
          <div className="mt-5">
            <ElectiveAvailabilityWindowForm departments={departmentOptions} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">הגדרות קיימות</h2>
            <Badge tone="default">{settings.length}</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {settings.map((item) => (
              <div key={item.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-ink">{departmentLabel(item.department)}</p>
                <p className="mt-1 text-slate-600">
                  {item.availabilityMode === "OPEN_BY_DEFAULT" ? "פתוח כברירת מחדל" : "סגור כברירת מחדל"} · עד{" "}
                  {item.maxStudentsAtOnce} סטודנטים במקביל
                </p>
              </div>
            ))}
            {settings.length === 0 ? <p className="text-sm text-slate-600">אין הגדרות קיימות.</p> : null}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">חלונות אחרונים</h2>
            <Badge tone="default">{windows.length}</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {windows.map((item) => (
              <div key={item.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{departmentLabel(item.department)}</p>
                  <Badge tone={item.status === "OPEN" ? "success" : "danger"}>{item.status === "OPEN" ? "פתוח" : "סגור"}</Badge>
                </div>
                <p className="mt-1 text-slate-600">
                  {formatDate(item.startsAt)} - {formatDate(item.endsAt)}
                </p>
              </div>
            ))}
            {windows.length === 0 ? <p className="text-sm text-slate-600">אין חלונות זמינות.</p> : null}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
