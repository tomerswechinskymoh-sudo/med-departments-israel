"use client";

import { useMemo, useState } from "react";
import { ReviewForm } from "@/components/forms/review-form";
import { Modal } from "@/components/ui/modal";

type ReviewerType = "RESIDENT" | "INTERN" | "STUDENT";

const roleChoices: Array<{ value: ReviewerType; label: string; description: string }> = [
  {
    value: "RESIDENT",
    label: "מתמחה/ה",
    description: "לשתף איך המחלקה נראית מבפנים ביום־יום."
  },
  {
    value: "INTERN",
    label: "סטאז׳ר/ית",
    description: "לספר איך נראה הסבב באמת, מה לומדים ומה הקצב."
  },
  {
    value: "STUDENT",
    label: "סטודנט/ית",
    description: "לשתף סבב, אלקטיב או יום חשיפה שעזר להבין את המקום."
  }
];

export function ExperienceCta({
  departments,
  selectedDepartmentId,
  className,
  buttonClassName,
  description
}: {
  departments: {
    id: string;
    slug: string;
    name: string;
    institution: { name: string };
  }[];
  selectedDepartmentId?: string;
  className?: string;
  buttonClassName?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ReviewerType | null>(null);

  const selectedLabel = useMemo(
    () => roleChoices.find((role) => role.value === selectedRole)?.label,
    [selectedRole]
  );

  function closeModal() {
    setOpen(false);
    setSelectedRole(null);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          "inline-flex items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-6 py-3 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5 hover:shadow-xl"
        }
      >
        רוצה לספר על החוויה שלך?
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title="רוצה לספר על החוויה שלך?"
        description={
          description ??
          "אפשר לשתף גם בלי לפתוח חשבון. הטלפון נשמר רק לאימות, ומה שיעלה לאתר תלוי בבחירה שלך ובעמידה בבדיקה."
        }
        className="max-w-5xl"
      >
        {!selectedRole ? (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-slate-500">מאיפה את/ה משתף/ת?</p>
            <div className="grid gap-4 md:grid-cols-3">
              {roleChoices.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className="rounded-[1.75rem] border border-brand-100 bg-gradient-to-b from-white to-brand-50/50 p-5 text-right transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-panel"
                >
                  <p className="text-lg font-bold text-ink">{role.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-brand-100 bg-gradient-to-l from-brand-50 to-white p-4">
              <div>
                <p className="text-sm font-semibold text-brand-700">המסלול שבחרת</p>
                <p className="mt-1 text-lg font-bold text-ink">{selectedLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-white"
              >
                בחירה מחדש
              </button>
            </div>

            <ReviewForm
              departments={departments}
              selectedDepartmentId={selectedDepartmentId}
              initialReviewerType={selectedRole}
              compact
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
