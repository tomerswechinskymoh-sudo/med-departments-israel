import { notFound } from "next/navigation";
import { OpeningApplicationForm } from "@/components/openings/opening-application-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOpeningApplicationPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OpeningApplyPage({
  params
}: {
  params: Promise<{ openingId: string }>;
}) {
  const { openingId } = await params;
  const opening = await getOpeningApplicationPageData(openingId);

  if (!opening) {
    notFound();
  }

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="bg-brand-900 text-white">
          <p className="text-sm font-semibold text-brand-100">מועמדות פרטית לפתיחה</p>
          <h1 className="mt-2 text-3xl font-bold">{opening.title}</h1>
          <p className="mt-3 text-sm leading-7 text-brand-50">
            {opening.department.institution.name} · {opening.department.name} · {opening.department.specialty.name}
          </p>
        </Card>

        <Card>
          <SectionHeading
            title="שליחת מועמדות למחלקה"
            description="הטופס הזה פרטי. קורות החיים, התמונה ושאר הפרטים נגישים רק לנציגים מורשים של המחלקה ולאדמינים."
          />
          <div className="mt-6">
            <OpeningApplicationForm openingId={opening.id} />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
