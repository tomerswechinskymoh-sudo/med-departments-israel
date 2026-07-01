import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ElectiveApplicationForm } from "@/components/electives/student-electives-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAuth } from "@/lib/auth-guards";
import { getElectiveDepartmentBySlug, requireStudentElectivesPreviewEnabled } from "@/lib/student-electives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function StudentElectiveApplyPage({
  params
}: {
  params: Promise<{ departmentSlug: string }>;
}) {
  requireStudentElectivesPreviewEnabled();
  const session = await requireAuth();
  const { departmentSlug } = await params;
  const department = await getElectiveDepartmentBySlug(departmentSlug);

  if (!department) {
    notFound();
  }

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Private preview"
        title="הגשת בקשה לאלקטיב"
        description={`${department.institution.name} · ${department.specialty.name}. בשלב ה-Preview נדרש חשבון משתמש רגיל; הבחנה מלאה לסטודנטים תתווסף בהמשך.`}
      />
      <Card>
        <p className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
          הבקשה תישמר כ-SUBMITTED ולא תאושר אוטומטית. המידע יוצג רק למשתמש שלך ולאדמין.
        </p>
        <ElectiveApplicationForm departmentSlug={department.slug} />
      </Card>
      <Link href={`/electives/${department.slug}`} className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
        חזרה לעמוד האלקטיב
      </Link>
    </PageShell>
  );
}
