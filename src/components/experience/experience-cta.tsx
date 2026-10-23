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
  initiallyOpen = false,
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
        onClick={() => {

          setOpen(true);
        }}
        className={
          buttonClassName ??
          "inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-6 py-3 text-sm font-semibold text-brand-800  transition hover:-translate-y-0.5 "
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
          onSubmitted={() => {

            closeModal();
          }}
        />
      </Modal>
    </div>
  );
}
