import type { Metadata } from "next";
import Link from "next/link";
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
  }
];

export default async function AdminElectivesPage() {
  await requireAdmin();

  const [accounts, settings, windows, applications] = await Promise.all([
    prisma.electiveDepartmentAccount.count(),
    prisma.electiveDepartmentSettings.count(),
    prisma.electiveAvailabilityWindow.count(),
    prisma.electiveApplication.count()
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="ניהול אלקטיבים"
        description="מודול הכנה לניהול אלקטיבים מול מחלקות. בשלב זה אין חשיפה ציבורית ואין כניסת מחלקות חיצונית."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs font-black text-slate-500">חשבונות מחלקה</p>
          <p className="mt-2 text-3xl font-black text-ink">{accounts}</p>
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
    </PageShell>
  );
}
