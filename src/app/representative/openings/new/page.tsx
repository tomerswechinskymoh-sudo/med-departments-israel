import { redirect } from "next/navigation";
import { requireApprovedPublisher } from "@/lib/auth-guards";
import { OpeningEditorForm } from "@/components/openings/opening-editor-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getRepresentativeOpeningFormData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewOpeningPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireApprovedPublisher();
  const params = await searchParams;
  const preferredDepartmentId =
    typeof params.departmentId === "string" ? params.departmentId : undefined;
  const data = await getRepresentativeOpeningFormData(session.userId, undefined, {
    includeAllDepartments: session.role === "admin"
  });

  if (data.departmentOptions.length === 0) {
    redirect("/representative");
  }

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="bg-brand-900 text-white">
          <p className="text-sm font-semibold text-brand-100">פרסום רשמי</p>
          <h1 className="mt-2 text-3xl font-bold">פתיחה חדשה למחלקה</h1>
          <p className="mt-3 text-sm leading-7 text-brand-50">
            הפתיחה תופיע לציבור רק מתוך האזור המאושר הזה, ולא דרך ה־homepage הציבורי.
          </p>
        </Card>

        <Card>
          <SectionHeading
            title="פרטי הפתיחה"
            description="הגדירו כותרת, לוח זמנים, קריטריונים לקבלה, וכמה מועמדים מובילים תרצו לקבל במייל אחרי הדדליין."
          />
          <div className="mt-6">
            <OpeningEditorForm
              departmentOptions={data.departmentOptions}
              initialValues={{
                departmentId: preferredDepartmentId ?? data.departmentOptions[0]?.id ?? ""
              }}
            />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
