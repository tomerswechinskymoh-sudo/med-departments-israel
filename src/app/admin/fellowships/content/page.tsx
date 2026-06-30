import type { Metadata } from "next";
import { FellowshipExperienceForm, FellowshipSpecialtyForm } from "@/components/admin/fellowships-admin-forms";
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

export default async function AdminFellowshipContentPage() {
  await requireAdmin();

  const [baseSpecialties, fellowshipSpecialties, programs, experiences] = await Promise.all([
    prisma.specialty.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.fellowshipSpecialty.findMany({
      orderBy: { nameHe: "asc" }
    }),
    prisma.fellowshipProgram.findMany({
      select: {
        id: true,
        fellowshipSpecialtyId: true,
        institution: true,
        country: true,
        city: true,
        fellowshipSpecialty: { select: { nameHe: true } }
      },
      orderBy: { institution: "asc" }
    }),
    prisma.fellowshipIsraeliExperience.findMany({
      include: {
        fellowshipProgram: { select: { institution: true, country: true } },
        fellowshipSpecialty: { select: { nameHe: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    })
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="תוכן וניסיון ישראלי לפלושיפים"
        description="הכנה לעמוד ציבורי עתידי עם עוגנים: before fellowship, during fellowship, after fellowship. כרגע פנימי בלבד."
      />

      <Card>
        <h2 className="text-xl font-black text-ink">תוכן לפי תחום</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          השדות נשמרים במבנה שיכול להזין בעתיד עמוד /fellowship ועמודי /fellowship/[specialtySlug].
        </p>
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
        <h2 className="text-xl font-black text-ink">ניסיון ישראלי / אנשי קשר</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          כל פריט כולל הרשאת חשיפה: אדמין בלבד, פרסום אנונימי עתידי, או פרסום מזוהה עתידי.
        </p>
        <div className="mt-5">
          <FellowshipExperienceForm
            fellowshipSpecialties={fellowshipSpecialties.map((specialty) => ({ id: specialty.id, nameHe: specialty.nameHe }))}
            fellowshipPrograms={programs.map((program) => ({
              id: program.id,
              fellowshipSpecialtyId: program.fellowshipSpecialtyId,
              label: `${program.fellowshipSpecialty.nameHe} · ${program.institution} · ${program.city ? `${program.city}, ` : ""}${program.country}`
            }))}
            existing={experiences.map((experience) => ({
              id: experience.id,
              fellowshipProgramId: experience.fellowshipProgramId,
              fellowshipSpecialtyId: experience.fellowshipSpecialtyId,
              physicianName: experience.physicianName,
              roleTitle: experience.roleTitle,
              currentInstitution: experience.currentInstitution,
              contactEmail: experience.contactEmail,
              contactPhone: experience.contactPhone,
              experienceText: experience.experienceText,
              visibility: experience.visibility,
              notes: experience.notes,
              isPublished: experience.isPublished
            }))}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">פריטי ניסיון קיימים</h2>
          <Badge tone="default">{experiences.length}</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {experiences.map((experience) => (
            <div key={experience.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-ink">{experience.physicianName ?? experience.currentInstitution ?? "פריט ללא שם"}</p>
                <Badge tone={experience.visibility === "ADMIN_ONLY" ? "warning" : "default"}>{experience.visibility}</Badge>
              </div>
              <p className="mt-2 text-slate-600">
                {experience.fellowshipSpecialty?.nameHe ?? "ללא תחום"} · {experience.fellowshipProgram?.institution ?? "ללא תוכנית"}
              </p>
              {experience.contactEmail ? <p className="mt-1 text-xs text-slate-500">קשר פנימי: {experience.contactEmail}</p> : null}
            </div>
          ))}
          {experiences.length === 0 ? <p className="text-sm text-slate-600">אין עדיין פריטי ניסיון.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
