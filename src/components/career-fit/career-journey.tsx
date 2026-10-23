"use client";
import { Button } from "@/components/ui/button";
export function CareerJourney({
  onStart,
  onDepartments,
  startDisabled = false,
}: {
  onStart: () => void;
  onDepartments: () => void;
  startDisabled?: boolean;
}) {
  return (
    <section className="career-journey grid gap-6 rounded-xl border border-brand-100 bg-white p-6 sm:p-8 md:grid-cols-[1fr_auto]">
      <div>
        <p className="eyebrow">30 שאלות · כ־4–6 דקות · שמירה במכשיר</p>
        <h2 className="mt-3 text-2xl font-bold">
          מה מעניין אתכם בעבודה הרפואית?
        </h2>
        <p className="mt-3 max-w-xl leading-8 text-slate-600">
          שאלה אחת בכל פעם, בלי תשובה נכונה או שגויה. אפשר לחזור, לדלג ולהמשיך
          מאוחר יותר באותו מכשיר.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          כל 30 התשובות נדרשות לחישוב. דילוג נשאר כחסר מידע.
        </p>
      </div>
      <div className="flex flex-col justify-center gap-3">
        <Button disabled={startDisabled} onClick={onStart}>
          התחילו את שאלון ההתאמה <span className="ms-2">←</span>
        </Button>
        <Button variant="secondary" onClick={onDepartments}>
          ישירות להעדפות מחלקה
        </Button>
      </div>
    </section>
  );
}
