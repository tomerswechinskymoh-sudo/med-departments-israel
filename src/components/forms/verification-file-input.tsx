"use client";

import { useState } from "react";
import { VERIFICATION_PROOF_ACCEPT, verificationProofError } from "@/lib/verification-proof";

export function VerificationFileInput({ file, onSelect, maxUploadMb }: {
  file: File | null;
  onSelect: (file: File | null) => void;
  maxUploadMb: number;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <p id="verification-file-title" className="mb-2 text-sm font-semibold text-ink">אישור סטטוס מקצועי</p>
      {/* Keep both controls native: no click()/showPicker(), hidden input, or async activation. */}
      <label htmlFor="verification-file" className="mb-3 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white">
        {file ? "בחירת מסמך אחר מהמכשיר" : "בחירת מסמך מהמכשיר"}
      </label>
      <input
        id="verification-file"
        name="verificationProof"
        type="file"
        aria-labelledby="verification-file-title"
        aria-describedby={`verification-file-help verification-file-status${error ? " verification-file-error" : ""}`}
        aria-invalid={error ? true : undefined}
        accept={VERIFICATION_PROOF_ACCEPT}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          // Cancelling/reopening the picker must not discard a previously selected proof.
          if (!selected) return;
          const nextError = verificationProofError(selected, maxUploadMb);
          setError(nextError);
          onSelect(nextError ? null : selected);
          // Allow selecting the same rejected file again, while keeping a valid
          // selection visible in the native control as well as the status text.
          if (nextError) event.currentTarget.value = "";
        }}
        className="block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-brand-100 bg-white p-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700"
      />
      <p id="verification-file-status" role="status" className="mt-2 break-all text-sm text-slate-700">
        {file ? `המסמך שנבחר: ${file.name}` : "טרם נבחר מסמך."}
      </p>
      {error ? <p id="verification-file-error" role="alert" className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <p id="verification-file-help" className="mt-2 text-xs leading-5 text-slate-600">
        אפשר לבחור PDF, JPG או PNG עד {Math.min(5, maxUploadMb)}MB. באייפון אפשר לבחור קובץ דרך ״בחירת מסמך מהמכשיר״ או דרך כפתור בחירת הקובץ שמתחתיו.
        {" "}הבחירה אינה מעלה את המסמך לשרת; הוא יישלח רק בשליחת הטופס. המסמך אינו מוצג לציבור ואינו נשלח לאנליטיקה.
      </p>
    </div>
  );
}
