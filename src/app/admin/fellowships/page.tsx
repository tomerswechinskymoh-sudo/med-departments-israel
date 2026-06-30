import type { Metadata } from "next";
import Link from "next/link";
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

const fellowshipLinks = [
  {
    href: "/admin/fellowships/specialties",
    title: "תחומי פלושיפ",
    description: "קטגוריות לפי תחום בסיס, כולל תוכן עתידי לפי לפני/במהלך/אחרי פלושיפ."
  },
  {
    href: "/admin/fellowships/programs",
    title: "תוכניות פלושיפ",
    description: "מדינה, עיר, מוסד, מחלקה, משך, דרישות, קשר, אתר והערות."
  },
  {
    href: "/admin/fellowships/content",
    title: "תוכן וניסיון ישראלי",
    description: "מבנה תוכן עתידי ל-/fellowship וניהול אנשי קשר/חוויות עם הרשאות חשיפה."
  }
];

export default async function AdminFellowshipsPage() {
  await requireAdmin();

  const [specialties, programs, experiences, publishedPrograms] = await Promise.all([
    prisma.fellowshipSpecialty.count(),
    prisma.fellowshipProgram.count(),
    prisma.fellowshipIsraeliExperience.count(),
    prisma.fellowshipProgram.count({ where: { isPublished: true } })
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="מידע פלושיפים"
        description="מודול פנימי בלבד להכנת מאגר פלושיפים עתידי. אין חשיפה ציבורית בשלב זה."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs font-black text-slate-500">תחומי פלושיפ</p>
          <p className="mt-2 text-3xl font-black text-ink">{specialties}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">תוכניות</p>
          <p className="mt-2 text-3xl font-black text-ink">{programs}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">מסומנות לפרסום עתידי</p>
          <p className="mt-2 text-3xl font-black text-ink">{publishedPrograms}</p>
        </Card>
        <Card>
          <p className="text-xs font-black text-slate-500">ניסיון ישראלי</p>
          <p className="mt-2 text-3xl font-black text-ink">{experiences}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {fellowshipLinks.map((item) => (
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
