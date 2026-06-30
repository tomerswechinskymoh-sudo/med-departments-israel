import type { Metadata } from "next";
import { FellowshipProgramForm } from "@/components/admin/fellowships-admin-forms";
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

export default async function AdminFellowshipProgramsPage() {
  await requireAdmin();

  const [baseSpecialties, fellowshipSpecialties, programs] = await Promise.all([
    prisma.specialty.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.fellowshipSpecialty.findMany({
      select: { id: true, nameHe: true },
      orderBy: { nameHe: "asc" }
    }),
    prisma.fellowshipProgram.findMany({
      include: {
        fellowshipSpecialty: { select: { nameHe: true } },
        baseSpecialty: { select: { name: true } },
        _count: { select: { israeliExperiences: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 200
    })
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="תוכניות פלושיפ"
        description="ניהול תוכניות פלושיפ פנימיות. אין נתיב ציבורי ואין חשיפה ב-sitemap."
      />

      <Card>
        <h2 className="text-xl font-black text-ink">יצירה / עריכה</h2>
        <div className="mt-5">
          <FellowshipProgramForm
            fellowshipSpecialties={fellowshipSpecialties}
            baseSpecialties={baseSpecialties}
            existing={programs.map((program) => ({
              id: program.id,
              fellowshipSpecialtyId: program.fellowshipSpecialtyId,
              baseSpecialtyId: program.baseSpecialtyId,
              country: program.country,
              city: program.city,
              institution: program.institution,
              departmentName: program.departmentName,
              duration: program.duration,
              requirements: program.requirements,
              contactName: program.contactName,
              contactEmail: program.contactEmail,
              contactPhone: program.contactPhone,
              websiteUrl: program.websiteUrl,
              notes: program.notes,
              isPublished: program.isPublished
            }))}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">תוכניות קיימות</h2>
          <Badge tone="default">{programs.length} מוצגות</Badge>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">תחום</th>
                <th className="px-3 py-2">מוסד</th>
                <th className="px-3 py-2">מיקום</th>
                <th className="px-3 py-2">משך</th>
                <th className="px-3 py-2">סטטוס</th>
                <th className="px-3 py-2">ניסיון ישראלי</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{program.fellowshipSpecialty.nameHe}</p>
                    <p className="text-xs text-slate-500">{program.baseSpecialty?.name ?? "ללא תחום בסיס"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{program.institution}</p>
                    <p className="text-xs text-slate-500">{program.departmentName ?? "מחלקה לא צוינה"}</p>
                  </td>
                  <td className="px-3 py-3">{program.city ? `${program.city}, ${program.country}` : program.country}</td>
                  <td className="px-3 py-3">{program.duration ?? "לא צוין"}</td>
                  <td className="px-3 py-3">
                    <Badge tone={program.isPublished ? "success" : "default"}>{program.isPublished ? "מסומן לפרסום" : "טיוטה"}</Badge>
                  </td>
                  <td className="px-3 py-3">{program._count.israeliExperiences}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
