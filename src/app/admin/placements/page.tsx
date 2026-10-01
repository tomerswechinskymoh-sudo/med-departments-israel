import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { PageShell } from '@/components/layout/page-shell';
import { Card } from '@/components/ui/card';
import { pilotDesign } from '@/lib/placements/pilot-release';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function PlacementOperations() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/placements');
  if (session.role !== 'admin') notFound();
  return <PageShell><div dir="rtl" className="space-y-5 py-8">
    <h1 className="text-3xl font-bold">בקרת פיילוט סבבים ואלקטיבים</h1>
    <p role="status" className="rounded-xl bg-amber-100 p-4">PILOT_NOT_ENABLED — תכנון מוצר מאושר; השתתפות בית החולים טרם אושרה.</p>
    <Card><h2 className="text-xl font-bold">היקף מוצע — מידע פנימי בלבד</h2><p>מרכז רפואי רבין / בילינסון · הרדמה · סטודנטים בפקולטות בישראל</p><p>עד {pilotDesign.maxAccounts} חשבונות ברשימה מפורשת; הצעה אחת בכל פעם. הרשימה ריקה ואין מועדים או מקומות מפורסמים.</p><p>אימות מסמכים בערוץ המוסדי הקיים, לאחר אישור המוסד. יישמרו רק תוצאת אימות, מאמת, תוקף והפניית ביקורת מזערית.</p></Card>
    <Card><h2 className="text-xl font-bold">מינוי נציגים</h2><p>מנהל/ת בית חולים: ממתין לאימות. נציג/ת מחלקה: ממתין לאימות.</p><p>אין חשבון ממונה. הרשמה עצמית אינה מעניקה סמכות. מינוי מחייב אישור מוסדי מפורש ובדיקת מנהל הפלטפורמה.</p><button disabled className="mt-3 rounded-xl bg-slate-200 p-3">מינוי חסום עד אישור מוסדי והשלמת האינטגרציה</button></Card>
    <Card><h2 className="text-xl font-bold">חסמים להפעלה</h2><ul className="list-inside list-disc space-y-2"><li>אישור השתתפות המוסד, שרשרת האישורים ומדיניות הביטול.</li><li>אישור שיטת האימות החיצוני ושמירת נתוני האימות.</li><li>מינוי נציגים מאומתים ורשימת חשבונות מפורשת.</li><li>מועדים, מכסות ודרישות פקולטה/מחלקה שהוזנו בידי נציג מורשה.</li><li>התאמת סכמות וזרימות לגרסה הפרוסה; גיבוי ושחזור מאומתים.</li><li>סביבת תצוגה מוגנת עם מסד בדיקות מבודד ובדיקות הקצאה משותפות.</li></ul></Card>
    <Card><h2 className="text-xl font-bold">מצב תפעולי</h2><p>קליטת בקשות חדשות, אישורים סופיים, פרסום הצעות, הזמנות, ייבואים והעלאות: חסומים בשרת.</p><p>קבוצות, תשלומים והודעות חיצוניות: כבויים. תכנון זה אינו מוסיף תזמון מחיקת קבצים.</p><p>נתוני בקשות חסומות, אימותים, מחיקות ותפוסה בזרימת Phase 3B: טרם חוברו למסד הפרוס; אין להציג חוסר חיבור כאפס תקלות.</p><p>בקשות עבר אינן נמחקות או מבוטלות. מסלולי בקשת ביטול והכרעת ביטול הקיימים נשארים תחת בדיקות ההרשאה שלהם.</p></Card>
    <Link href="/placements" className="underline">לסקירת המסלולים הציבורית</Link>
  </div></PageShell>;
}
