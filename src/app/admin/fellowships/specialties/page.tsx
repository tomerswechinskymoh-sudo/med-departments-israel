import type { Metadata } from "next";
import { FellowshipsDemoTools } from "@/components/admin/admin-demo-actions";
import { FellowshipSpecialtyForm } from "@/components/admin/fellowships-admin-forms";
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

export default async function AdminFellowshipSpecialtiesPage() {
  await requireAdmin();

  const [baseSpecialties, fellowshipSpecialties] = await Promise.all([
    prisma.specialty.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.fellowshipSpecialty.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        baseSpecialty: { select: { name: true } },
        _count: { select: { programs: true, israeliExperiences: true } }
      }
    })
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="תחומי פלושיפ"
        description="יצירה ועריכה של קטגוריות פלושיפ לפי תחום בסיס. תוכן זה לא נחשף לציבור עדיין."
      />

      <Card>
        <h2 className="text-xl font-black text-ink">יצירה / עריכה</h2>
        <div className="mt-5">
          <FellowshipSpecialtyForm
            baseSpecialties={baseSpecialties}
            existing={fellowshipSpecialties.map((specialty) => ({
              id: specialty.id,
              baseSpecialtyId: specialty.baseSpecialtyId,
              slug: specialty.slug,
              nameHe: specialty.nameHe,
              nameEn: specialty.nameEn,
              description: specialty.description,
              beforeContent: specialty.beforeContent,
              duringContent: specialty.duringContent,
              afterContent: specialty.afterContent,
              isPublished: specialty.isPublished
            }))}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">QA / דמו פנימי</h2>
        <div className="mt-5">
          <FellowshipsDemoTools />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">רשימת תחומים</h2>
          <Badge tone="default">{fellowshipSpecialties.length}</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {fellowshipSpecialties.map((specialty) => (
            <div key={specialty.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-black text-ink">{specialty.nameHe}</p>
                  <p className="text-xs text-slate-500">{specialty.slug}</p>
                </div>
                <Badge tone={specialty.isPublished ? "success" : "default"}>{specialty.isPublished ? "מסומן לפרסום" : "טיוטה"}</Badge>
              </div>
              <p className="mt-3 text-slate-600">תחום בסיס: {specialty.baseSpecialty?.name ?? "לא משויך"}</p>
              <p className="mt-1 text-slate-600">
                {specialty._count.programs} תוכניות · {specialty._count.israeliExperiences} חוויות/אנשי קשר
              </p>
            </div>
          ))}
          {fellowshipSpecialties.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">אין עדיין תחומי פלושיפ. אפשר ליצור ידנית או להשתמש בדמו הפנימי.</p>
          ) : null}
        </div>
      </Card>
    </PageShell>
  );
}
