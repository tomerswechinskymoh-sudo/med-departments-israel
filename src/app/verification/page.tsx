import { requireAuth } from "@/lib/auth-guards";
import { getPublisherRequestFormContext } from "@/lib/queries";
import { VerificationRequestForm } from "@/components/forms/verification-request-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  await requireAuth();
  const { departments, institutions } = await getPublisherRequestFormContext();

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm font-semibold text-brand-600">בקשת הרשאת פרסום</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">פרסום עדכונים, משרות והזדמנויות רשמיות</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            משתמשים שרוצים לפרסם בשם מחלקה או מוסד מגישים כאן בקשה לאישור. רק אחרי אישור
            אדמין אפשר לנהל תוכן רשמי כמו תקנים, מחקר ועדכוני מחלקה.
          </p>
          <div className="mt-6">
            <VerificationRequestForm departments={departments} institutions={institutions} />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
