"use client";

import { useState } from "react";
import { ReviewForm } from "@/components/forms/review-form";
import { Modal } from "@/components/ui/modal";

export function ExperienceCta({
  departments,
  selectedDepartmentId,
  className,
  buttonClassName,
  description,
  initiallyOpen = false
}: {
  departments: {
    id: string;
    slug: string;
    name: string;
    institution: { id: string; name: string; type: "HOSPITAL" | "HMO" };
    specialty: { id: string; name: string };
  }[];
  selectedDepartmentId?: string;
  className?: string;
  buttonClassName?: string;
  description?: string;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  function closeModal() {
    setOpen(false);
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
        הוספת חוויה
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title="הוספת חוויה"
        description={
          description ??
          "שלושה צעדים קצרים: מי משתף, מה הייתה החוויה, ובדיקה אחרונה לפני שליחה."
        }
        className="max-w-5xl"
      >
        <ReviewForm
          departments={departments}
          selectedDepartmentId={selectedDepartmentId}
          onSubmitted={closeModal}
        />
      </Modal>
    </div>
  );
}
