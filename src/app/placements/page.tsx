import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "סבבים ואלקטיבים | hitmachut.org",
  description: "מידע על מסלולי הכשרה רפואית בישראל והיכרות עם מחלקות."
};

export default function PlacementsPage() {
  return (
    <PageShell className="space-y-6 py-8 md:py-10">
      <section className="rounded-[2rem] border border-brand-100 bg-white/90 p-6 shadow-panel md:p-9">
        <p className="text-sm font-semibold text-brand-700">הכשרה רפואית בישראל</p>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">סבבים ואלקטיבים</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
          הכירו מחלקות ומוסדות לפני בחירת מסלול ההכשרה. אפשר להתחיל בנתונים על תחומי התמחות
          ובמידע על המחלקות ברחבי הארץ.
        </p>
      </section>

      <section aria-labelledby="learner-routes" className="space-y-4">
        <h2 id="learner-routes" className="text-xl font-bold">מסלולי ההכשרה</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['סטודנט/ית לרפואה בישראל', 'אלקטיב בהתאם לאישור הפקולטה ולתנאי בית החולים.'],
            ['סטודנט/ית ישראלי/ת לרפואה בחו״ל', 'סבב קליני בכפוף לזכאות ולדרישות המוסד.'],
            ['סטאז׳ר/ית', 'אלקטיב במסגרת הסטאז׳ ובכפוף לאישורים המתאימים.']
          ].map(([title, description]) => <Card key={title} className="space-y-3 bg-white"><h3 className="font-bold">{title}</h3><p className="text-sm leading-7">{description}</p><p className="text-sm font-semibold text-brand-800">ההרשמה טרם נפתחה</p></Card>)}
        </div>
        <p className="leading-8">הרשמה דרך המערכת תיפתח לאחר פרסום מועדים על ידי בית החולים. בחירת מסלול אינה אישור זכאות, והגשת בקשה אינה מבטיחה מקום.</p>
        <p className="text-sm leading-7">אין להעלות או לשלוח מסמכים רגישים דרך המערכת בשלב זה.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 bg-white">
          <h2 className="text-xl font-bold text-ink">היכרות עם מחלקות</h2>
          <p className="text-sm leading-7 text-slate-700">
            השוו תחומי התמחות ומחלקות לפי נתונים ארציים, מידע על מוסדות וחוויות מהשטח.
          </p>
          <Link
            href="/departments"
            className="inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
          >
            למאגר המחלקות
          </Link>
        </Card>
        <Card className="space-y-4 bg-white">
          <p className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
            מידע בלבד
          </p>
          <h2 className="text-xl font-bold text-ink">הגשת בקשות לסבבים ואלקטיבים</h2>
          <p className="text-sm leading-7 text-slate-700">
            בעמוד זה עדיין אין הגשת בקשות או רשימת מקומות זמינים. זמינות ותנאי קבלה יוצגו רק
            לאחר אימות מול המוסדות הרלוונטיים.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
