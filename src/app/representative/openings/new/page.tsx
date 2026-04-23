import { redirect } from "next/navigation";
import { requireRepresentative } from "@/lib/auth-guards";
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
  const session = await requireRepresentative();
  const params = await searchParams;
  const preferredDepartmentId =
    typeof params.departmentId === "string" ? params.departmentId : undefined;
  const data = await getRepresentativeOpeningFormData(session.userId);

  if (data.departmentOptions.length === 0) {
    redirect("/representative");
  }

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="bg-brand-900 text-white">
          <p className="text-sm font-semibold text-brand-100">פרסום רשמי</p>
          <h1 className="mt-2 text-3xl font-bold">תקן פתוח חדש למחלקה</h1>
          <p className="mt-3 text-sm leading-7 text-brand-50">
            ההצעה תישלח קודם לאישור אדמין. רק אחרי אישור היא תעלה לציבור.
          </p>
        </Card>

        <Card>
          <SectionHeading
            title="פרטי התקן הפתוח"
            description="מגדירים תוכן, לוח זמנים, דגשים לקבלה וכמה מועמדים מובילים תרצו לקבל אחרי הדדליין. הכול נשמר קודם לבדיקה."
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
