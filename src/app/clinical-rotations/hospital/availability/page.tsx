import Link from "next/link";
import {
  ClinicalRotationActionForm,
  ClinicalRotationAvailabilityForm
} from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  getClinicalRotationHospitalDashboard,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationHospitalAvailabilityPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital/availability"
  });
  const data = await getClinicalRotationHospitalDashboard(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={context.selectedHospital.name}
        title="זמינות וסגירות"
        description="חלונות פתוחים הם תנאי מקדים לפרסום. סגירות חוסמות בקשות גם אם הן בתוך חלון פתוח."
      />

      <ClinicalRotationAvailabilityForm
        hospitalId={context.selectedHospital.id}
        windows={data.windows.map((window) => ({
          id: window.id,
          label: clinicalRotationDateRangeLabel(window.startsAt, window.endsAt)
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black text-ink">חלונות פתוחים</h2>
          <div className="mt-4 space-y-3">
            {data.windows.map((window) => (
              <div key={window.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4">
                <div>
                  <p className="font-black text-ink">{clinicalRotationDateRangeLabel(window.startsAt, window.endsAt)}</p>
                  {window.notes ? <p className="mt-1 text-sm text-slate-600">{window.notes}</p> : null}
                </div>
                <ClinicalRotationActionForm
                  endpoint="/api/clinical-rotations/hospital/availability"
                  payload={{ action: "deleteWindow", hospitalId: context.selectedHospital.id, id: window.id }}
                  label="מחיקה"
                  tone="danger"
                />
              </div>
            ))}
            {data.windows.length === 0 ? <p className="text-sm text-slate-600">אין חלונות פתוחים. בית החולים סגור להגשות.</p> : null}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-ink">תאריכי סגירה</h2>
          <div className="mt-4 space-y-3">
            {data.blackouts.map((blackout) => (
              <div key={blackout.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4">
                <div>
                  <p className="font-black text-ink">{clinicalRotationDateRangeLabel(blackout.startsAt, blackout.endsAt)}</p>
                  {blackout.reason ? <p className="mt-1 text-sm text-slate-600">{blackout.reason}</p> : null}
                </div>
                <ClinicalRotationActionForm
                  endpoint="/api/clinical-rotations/hospital/availability"
                  payload={{ action: "deleteBlackout", hospitalId: context.selectedHospital.id, id: blackout.id }}
                  label="מחיקה"
                  tone="danger"
                />
              </div>
            ))}
            {data.blackouts.length === 0 ? <p className="text-sm text-slate-600">לא הוגדרו סגירות.</p> : null}
          </div>
        </Card>
      </div>

      <Link href={`/clinical-rotations/hospital?hospitalId=${context.selectedHospital.id}`} className="inline-flex text-sm font-black text-brand-700">
        חזרה לפורטל
      </Link>
    </PageShell>
  );
}
