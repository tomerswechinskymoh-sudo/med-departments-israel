import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { getDepartmentEditorPageData } from "@/lib/queries";
import { DepartmentEditorForm } from "@/components/forms/department-editor-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

export default async function AdminDepartmentEditPage({
  params
}: {
  params: Promise<{ departmentId: string }>;
}) {
  await requireAdmin();
  const { departmentId } = await params;
  const department = await getDepartmentEditorPageData(departmentId);

  if (!department) {
    notFound();
  }

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="עריכת מחלקה"
        title={`${department.institution.name} · ${department.name}`}
        description="אדמין יכול לעדכן כל עמוד מחלקה ישירות. שינויים מכאן נשמרים מיד."
      />

      <Card>
        <DepartmentEditorForm
          initialValues={{
            departmentId: department.id,
            departmentName: department.name,
            institutionName: department.institution.name,
            specialtyName: department.specialty.name,
            shortSummary: department.shortSummary,
            about: department.about,
            practicalInfo: department.practicalInfo,
            publicContactEmail: department.publicContactEmail ?? "",
            publicContactPhone: department.publicContactPhone ?? "",
            heads: department.heads.map((head) => ({
              id: head.id,
              name: head.name,
              title: head.title,
              role: head.role ?? "",
              bio: head.bio,
              profileImageUrl: head.profileImageUrl ?? ""
            })),
            officialUpdates: department.officialUpdates.map((update) => ({
              id: update.id,
              title: update.title,
              body: update.body
            })),
            researchOpportunities: department.researchOpportunities.map((opportunity) => ({
              id: opportunity.id,
              title: opportunity.title,
              summary: opportunity.summary,
              description: opportunity.description,
              contactInfo: opportunity.contactInfo ?? ""
            }))
          }}
          endpoint={`/api/admin/departments/${department.id}`}
          submitLabel="שמירת שינויים"
          submittingLabel="שומר/ת..."
        />
      </Card>
    </PageShell>
  );
}
