import type { Metadata } from "next";
import { ElectivesDemoTools } from "@/components/admin/admin-demo-actions";
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

export default async function AdminElectivesDemoPage() {
  await requireAdmin();
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      institution: { select: { name: true } },
      specialty: { select: { name: true } }
    },
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }],
    take: 200
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="דמו מלא לאלקטיבים"
        description="יוצר נציג/ת מחלקות, שתי מחלקות מנוהלות, הגדרות זמינות, חלונות ומועמדויות בכל הסטטוסים המרכזיים."
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">Hidden preview</Badge>
          <Badge tone="default">No public nav</Badge>
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
