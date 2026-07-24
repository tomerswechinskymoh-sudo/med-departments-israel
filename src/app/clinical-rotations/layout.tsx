import type { ReactNode } from "react";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const metadata = clinicalRotationNoIndexMetadata;

export default function ClinicalRotationsLayout({ children }: { children: ReactNode }) {
  return children;
}
