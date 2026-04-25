import { EXPERIENCE_LEGAL_WARNING, REVIEW_GUIDELINES } from "@/lib/constants";
import { ClipboardHeartIcon, ShieldCheckIcon } from "@/components/ui/med-icons";

export function ExperienceGuidancePanels({
  compact = false
}: {
  compact?: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-brand-100/80 bg-gradient-to-b from-brand-50/95 to-white p-5 shadow-panel">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-900 text-white">
            <ClipboardHeartIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-brand-700">איך לגרום לזה באמת לעזור</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              כמה נקודות קצרות שעוזרות לשיתוף להיות ברור, שימושי וקל לאישור.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
          {REVIEW_GUIDELINES.map((guideline) => (
            <li key={guideline}>{guideline}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50/80 p-5 shadow-panel">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
            <ShieldCheckIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-rose-800">לפני שכותבים טקסט חופשי</p>
            <p className="mt-1 text-xs leading-6 text-rose-700/80">
              העקרונות האלה שומרים גם עלייך וגם על מי שקורא/ת אחרייך.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-rose-900">
          {EXPERIENCE_LEGAL_WARNING.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
        {compact ? (
          <p className="mt-4 text-xs leading-6 text-rose-800/80">
            גם שיתוף קצר לגמרי בסדר. המטרה היא תמונה אמיתית, לא טקסט ארוך.
          </p>
        ) : null}
      </section>
    </div>
  );
}
