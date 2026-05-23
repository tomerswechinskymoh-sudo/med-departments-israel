import Link from "next/link";
import { HomeHeroImage } from "@/components/home/home-hero-image";
import { HomeSection } from "@/components/home/home-section";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import {
  ClipboardHeartIcon,
  DepartmentDirectoryIcon,
  SearchPulseIcon
} from "@/components/ui/med-icons";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

const trustItems = [
  "מקורות רשמיים",
  "שיתופי קהילה מאומתים",
  "מידע מתעדכן לאורך זמן"
];

const decisionSteps = [
  {
    title: "בוחרים תחום התמחות",
    description: "מתחילים מהתחום שרוצים להשוות",
    icon: SearchPulseIcon
  },
  {
    title: "משווים בין מחלקות",
    description: "רואים תוכניות, נתונים ומידע שימושי",
    icon: DepartmentDirectoryIcon
  },
  {
    title: "נכנסים לפרופיל מלא",
    description: "פותחים עמוד מחלקה עם תמונה מלאה",
    icon: ClipboardHeartIcon
  }
];

const dataCollectionCards = [
  {
    icon: "🏥",
    title: "מקורות רשמיים",
    description: "משרד הבריאות, נתוני התמחות, מידע ציבורי ופרסומים רשמיים"
  },
  {
    icon: "🌐",
    title: "אתרי בתי חולים ומחלקות",
    description:
      "מידע על מחלקות, צוותים, תחומי עניין, דרכי יצירת קשר ונתונים המתפרסמים באתרי בתי החולים"
  },
  {
    icon: "👩‍⚕️",
    title: "הקהילה הרפואית",
    description: "חוויות מאומתות של סטודנטים, סטאז׳רים ומתמחים לאחר אימות"
  },
  {
    icon: "📊",
    title: "נתונים משלימים",
    description: "מחקר, פרסומים, מדדים אקדמיים ונתונים המתעדכנים לאורך זמן"
  }
];

export default function HomePage() {
  return (
    <PageShell className="space-y-8 py-6 md:space-y-10 md:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 shadow-panel">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="space-y-6 p-5 md:p-7 lg:p-8">
            <p className="text-sm font-semibold text-brand-700">לפני שבוחרים, בודקים</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl lg:text-[3.4rem]">
                לדעת איך מחלקה באמת נראית, לפני שנכנסים אליה
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-700">
                מחלקות, מסלולים, מידע רשמי וניסיון מצטבר מהשטח.
                <br className="hidden md:block" />
                מקום אחד להתחיל ממנו לפני שמשווים ובוחרים לאן להעמיק.
              </p>
            </div>

            <form
              id="home-search"
              action="/departments"
              className="rounded-[1.5rem] border border-brand-100 bg-white/96 p-3 shadow-panel"
            >
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  name="search"
                  placeholder="חפשו מחלקה, בית חולים או תחום"
                  className="min-h-14 w-full rounded-full border border-brand-100 bg-surface px-5 py-3 text-sm outline-none transition focus:border-brand-300 md:flex-1"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
                >
                  חפש מחלקה
                </button>
              </div>
            </form>

            <div className="grid gap-2 md:grid-cols-3">
              {decisionSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3"
                >
                  <p className="text-xs font-black text-brand-700">שלב {index + 1}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-brand-100 bg-brand-50/70 px-4 py-2 text-xs font-semibold text-brand-800"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 p-5 pt-0 md:p-7 md:pt-0 lg:p-8 lg:pr-0">
            <HomeHeroImage />

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Card className="bg-brand-900 py-5 text-white">
                <p className="text-xs font-semibold text-brand-100">מבפנים</p>
                <p className="mt-2 text-sm leading-7 text-brand-50">
                  להבין את המחלקה מבפנים
                </p>
              </Card>
              <Card className="py-5">
                <p className="text-xs font-semibold text-brand-700">ביום־יום</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  לראות איך זה באמת מרגיש ביום־יום
                </p>
              </Card>
              <Card className="py-5">
                <p className="text-xs font-semibold text-brand-700">לפני שנכנסים</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  לדעת למה לצפות לפני שנכנסים
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <HomeSection tone="plain" className="space-y-6">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow="אמון ושקיפות"
            title="איך נאסף המידע?"
            description="המידע באתר משלב מקורות רשמיים יחד עם ניסיון מהשטח כדי לעזור לקבל החלטות מושכלות."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dataCollectionCards.map((card) => (
            <Card key={card.title} className="bg-white py-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
                {card.icon}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{card.description}</p>
            </Card>
          ))}
        </div>
        <p className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-center text-sm leading-7 text-slate-600">
          המידע באתר נאסף ממקורות ציבוריים ומשיתופי קהילה מאומתים. ייתכנו פערים או שינויים
          בין פרסומים רשמיים לעדכונים בשטח.
        </p>
        <div className="flex justify-center">
          <Link
            href="/departments"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-brand-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            התחל להשוות מחלקות
          </Link>
        </div>
      </HomeSection>
    </PageShell>
  );
}
