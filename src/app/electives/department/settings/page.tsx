import type { Metadata } from "next";
import Link from "next/link";
import {
  ElectiveDepartmentLogoutButton,
  ElectiveDepartmentSettingsPortalForm
} from "@/components/electives/department-portal-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSelectedElectiveDepartment, requireElectiveDepartmentSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function ElectiveDepartmentSettingsPage({ searchParams }: { searchParams?: Promise<{ departmentId?: string }> }) {
  const session = await requireElectiveDepartmentSession();
  const selectedDepartment = getSelectedElectiveDepartment(session, (await searchParams)?.departmentId) ?? session.assignedDepartments[0];
  const settings = await prisma.electiveDepartmentSettings.findUnique({
    where: { departmentId: selectedDepartment.id }
  });

  return (
    <PageShell className="space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          eyebrow="Private department portal"
          title="הגדרות אלקטיב"
          description={`${selectedDepartment.institutionName} · ${selectedDepartment.specialtyName}. העריכה מוגבלת למחלקות שהוקצו לחשבון.`}
        />
        <div className="flex flex-wrap gap-2">
          <Link href="/electives/department" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">
            חזרה
          </Link>
          <ElectiveDepartmentLogoutButton />
        </div>
      </div>
      <Card>
        <ElectiveDepartmentSettingsPortalForm
          departmentId={selectedDepartment.id}
          initialSettings={
            settings
              ? {
                  maxStudentsAtOnce: settings.maxStudentsAtOnce,
                  availabilityMode: settings.availabilityMode,
                  minDurationDays: settings.minDurationDays,
                  maxDurationDays: settings.maxDurationDays,
                  contactEmail: settings.contactEmail,
                  contactPhone: settings.contactPhone,
                  instructions: settings.instructions,
                  notes: settings.notes,
                  allowApplications: settings.allowApplications
                }
              : null
          }
        />
      </Card>
    </PageShell>
  );
}
