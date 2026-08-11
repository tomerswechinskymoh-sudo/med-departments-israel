import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getClinicalRotationSearchOptions,
  listClinicalRotationOfferings,
  parseClinicalRotationSearch
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationsPage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams;
  const search = parseClinicalRotationSearch(rawParams);
  const [options, offerings] = await Promise.all([
    getClinicalRotationSearchOptions(),
    listClinicalRotationOfferings(rawParams)
  ]);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="סבבים קליניים לסטודנטים מחו״ל"
        title="סבבים קליניים בישראל"
        description="איתור סבבים פתוחים בבתי חולים בישראל. הגישה ישירה ומוסתרת בשלב זה."
      />

      <Card>
        <form className="space-y-4" action="/clinical-rotations">
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">בית חולים</span>
              <select name="hospitalIds" defaultValue={search.hospitalIds[0] ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm">
                <option value="">כל בתי החולים</option>
                {options.hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">תחום</span>
              <select name="specialtyIds" defaultValue={search.specialtyIds[0] ?? ""} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm">
                <option value="">כל התחומים</option>
                {options.specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">מתאריך</span>
              <input name="start" type="date" defaultValue={search.start} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">עד תאריך</span>
              <input name="end" type="date" defaultValue={search.end} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">מחיר מירבי</span>
              <input name="maxPrice" type="number" min="0" defaultValue={search.maxPrice} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">תשלום</span>
              <select name="paymentMethod" defaultValue={search.paymentMethod} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm">
                <option value="">כל השיטות</option>
                <option value="CASH_AT_ROTATION">מזומן</option>
                <option value="EXTERNAL_PAYMENT_LINK">קישור חיצוני</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">אזור</span>
              <select name="region" defaultValue={search.region} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm">
                <option value="">כל האזורים</option>
                {options.regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-black text-slate-600">משך בשבועות</span>
              <input name="durationWeeks" type="number" min="1" max="52" defaultValue={search.durationWeeks} className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm font-bold text-slate-700">
              <input name="groupOnly" type="checkbox" value="1" defaultChecked={search.groupOnly} />
              רק סבבים עם הרשמה קבוצתית
            </label>
          </div>
          <input name="search" defaultValue={search.search} placeholder="חיפוש לפי בית חולים, מחלקה או תחום" className="w-full rounded-2xl border border-brand-100 px-4 py-3 text-sm" />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">חיפוש</button>
            <Link href="/clinical-rotations/my-rotations" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
              הסבבים שלי
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {offerings.map((offering) => (
          <Card key={offering.id} className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={offering.minimumMet ? "success" : "warning"}>
                  {offering.minimumMet ? "מינימום משתתפים הושג" : "מינימום משתתפים טרם הושג"}
                </Badge>
                <Badge>{offering.priceLabel}</Badge>
              </div>
              <div>
                <h2 className="text-xl font-black text-ink">{offering.displayName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {offering.hospital.name} · {offering.specialty.name}
                  {offering.department ? ` · ${offering.department.name}` : ""}
                </p>
              </div>
              <p className="text-sm leading-7 text-slate-700">{offering.dateLabel}</p>
              <p className="text-xs font-bold text-slate-500">
                משתתפים מאושרים: {offering.participantCount}{offering.maximumCapacity ? ` / ${offering.maximumCapacity}` : ""} · מינימום {offering.minimumParticipants}
              </p>
              <p className="text-xs font-bold text-slate-500">
                משך: {offering.minDurationWeeks}-{offering.maxDurationWeeks} שבועות · {offering.groupRegistrationEnabled ? "קבוצות בהזמנה" : "הרשמה אישית"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/clinical-rotations/${offering.slug}`} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
                פרטים
              </Link>
              <Link href={`/clinical-rotations/${offering.slug}/apply`} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
                הגשה
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {offerings.length === 0 ? (
        <Card>
          <p className="text-sm font-semibold text-slate-700">אין כרגע סבבים קליניים פתוחים להגשת בקשות.</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">בתי חולים סגורים כברירת מחדל עד שנציג מגדיר זמינות ותשלום.</p>
        </Card>
      ) : null}
    </PageShell>
  );
}
