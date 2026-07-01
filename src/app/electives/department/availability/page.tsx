import type { Metadata } from "next";
import Link from "next/link";
import {
  ElectiveDepartmentAvailabilityManager,
  ElectiveDepartmentLogoutButton
} from "@/components/electives/department-portal-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireElectiveDepartmentSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function ElectiveDepartmentAvailabilityPage() {
  const session = await requireElectiveDepartmentSession();
  const windows = await prisma.electiveAvailabilityWindow.findMany({
    where: { departmentId: session.departmentId },
    orderBy: [{ startsAt: "asc" }, { endsAt: "asc" }]
  });

  return (
    <PageShell className="space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          eyebrow="Private department portal"
          title="חלונות זמינות"
          description={`${session.institutionName} · ${session.specialtyName}. ניתן להגדיר חלונות פתוחים או סגורים למחלקה בלבד.`}
        />
        <div className="flex flex-wrap gap-2">
          <Link href="/electives/department" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">
            חזרה
          </Link>
          <ElectiveDepartmentLogoutButton />
        </div>
      </div>
      <Card>
        <ElectiveDepartmentAvailabilityManager
          windows={windows.map((window) => ({
            id: window.id,
            status: window.status,
            startsAt: dateInput(window.startsAt),
            endsAt: dateInput(window.endsAt),
            capacityOverride: window.capacityOverride,
            reason: window.reason,
            note: window.note
          }))}
        />
      </Card>
    </PageShell>
  );
}
