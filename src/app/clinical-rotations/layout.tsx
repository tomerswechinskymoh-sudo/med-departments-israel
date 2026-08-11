import type { ReactNode } from "react";
import { ClinicalRotationsDemoBanner } from "@/components/clinical-rotations/clinical-rotations-demo-banner";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const metadata = clinicalRotationNoIndexMetadata;

export default function ClinicalRotationsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ClinicalRotationsDemoBanner />
      {children}
    </>
  );
}
