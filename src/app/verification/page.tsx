import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function VerificationPage() {
  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm font-semibold text-brand-600">תפקידי נציג/ה</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">גישה לנציגי מחלקה נפתחת ידנית</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            אין מסלול הרשמה עצמי לנציגי מחלקה. אם צריך לפתוח גישת נציג/ה או לשייך חשבון למחלקה,
            זה נעשה ידנית על ידי אדמין מתוך המערכת.
          </p>
          <div className="mt-6 rounded-[1.75rem] border border-brand-100 bg-brand-50/70 p-5 text-sm leading-7 text-slate-700">
            <p>מה כן אפשר לעשות לבד?</p>
            <p className="mt-2">ליצור חשבון רגיל, לשמור מחלקות להשוואה, ולהגיש מועמדות מתוך חשבון מחובר.</p>
            <p className="mt-2">מה אי אפשר לעשות לבד? לפתוח חשבון נציג/ה או לפרסם תוכן רשמי בשם מחלקה.</p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
