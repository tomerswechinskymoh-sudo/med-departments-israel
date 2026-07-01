import type { Metadata } from "next";
import Link from "next/link";
import { ElectivesDemoTools } from "@/components/admin/admin-demo-actions";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

const electiveLinks = [
  {
    href: "/admin/electives/departments",
    title: "חשבונות והגדרות מחלקות",
    description: "יצירת חשבון מחלקה, סיסמה מוצפנת והגדרות זמינות בסיסיות."
  },
  {
    href: "/admin/electives/applications",
    title: "מועמדויות אלקטיב",
    description: "תצוגת אדמין למועמדויות עתידיות. אין עדיין מסלול סטודנטים ציבורי."
  },
  {
    href: "/admin/electives/settings",
    title: "חלונות זמינות",
    description: "ניהול מצב פתוח/סגור וחלונות תאריכים לכל מחלקה."
  },
  {
    href: "/admin/electives/demo",
    title: "דמו מלא לאלקטיבים",
    description: "יצירת נציג רב-מחלקתי, זמינות, מועמדויות וסטטוסים לבדיקת הזרימה."
  }
];

export default async function AdminElectivesPage() {
  await requireAdmin();

  const [accounts, representatives, settings, windows, applications, departments] = await Promise.all([
    prisma.electiveDepartmentAccount.count(),
    prisma.electiveRepresentativeAccount.count(),
    prisma.electiveDepartmentSettings.count(),
    prisma.electiveAvailabilityWindow.count(),
    prisma.electiveApplication.count(),
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } }
      },
      orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }],
      take: 100
    })
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="ניהול אלקטיבים"
        description="מודול הכנה לניהול אלקטיבים מול מחלקות. בשלב זה אין חשיפה ציבורית ואין כניסת מחלקות חיצונית."
      />

      <div className="grid gap-3 md:grid-cols-5">
        <Card>
          <p className="text-xs font-black text-slate-500">חשבונות מחלקה</p>
          <p className="mt-2 text-3xl font-black text-ink">{accounts}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">נציגים</p>
          <p className="mt-2 text-3xl font-black text-ink">{representatives}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">הגדרות</p>
          <p className="mt-2 text-3xl font-black text-ink">{settings}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">חלונות זמינות</p>
          <p className="mt-2 text-3xl font-black text-ink">{windows}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">מועמדויות</p>
          <p className="mt-2 text-3xl font-black text-ink">{applications}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {electiveLinks.map((item) => (
          <Card key={item.href} className="flex h-full flex-col justify-between gap-5">
            <div>
              <Badge tone="warning">לא ציבורי</Badge>
              <h2 className="mt-4 text-xl font-black text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
            </div>
            <Link href={item.href} className="inline-flex w-fit rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
              פתיחה
            </Link>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-ink">QA / דמו פנימי</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              יצירת חשבון דמו, הגדרות, חלונות ומועמדויות. אין שמירת סיסמה גלויה.
            </p>
          </div>
          <Badge tone="warning">Admin only</Badge>
        </div>
        <div className="mt-5">
          {departments.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין מחלקות זמינות לנתוני דמו.</p>
          ) : (
            <ElectivesDemoTools
              departments={departments.map((department) => ({
                id: department.id,
                label: `${department.institution.name} · ${department.specialty.name} · ${department.name}`
              }))}
            />
          )}
        </div>
      </Card>
    </PageShell>
  );
}
