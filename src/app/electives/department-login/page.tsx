import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ElectiveDepartmentLoginForm } from "@/components/electives/department-portal-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getElectiveDepartmentSession, isElectiveDepartmentPortalEnabled } from "@/lib/elective-department-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function ElectiveDepartmentLoginPage() {
  if (!isElectiveDepartmentPortalEnabled()) {
    notFound();
  }

  const session = await getElectiveDepartmentSession();

  if (session) {
    redirect("/electives/department");
  }

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <SectionHeading
          eyebrow="Private department portal"
          title="כניסת מחלקה לניהול אלקטיבים"
          description="גישה פרטית למחלקות בלבד. אין בשלב זה הרשמה ציבורית של סטודנטים לאלקטיבים."
        />
        <Card>
          <ElectiveDepartmentLoginForm />
        </Card>
      </div>
    </PageShell>
  );
}
