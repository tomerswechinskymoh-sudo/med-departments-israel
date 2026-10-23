import Link from "next/link";
import type { ReactNode } from "react";
import { CliniciansIllustration } from "@/components/layout/clinicians-illustration";
export function PageIntro({
  title,
  description,
  eyebrow,
  children,
  image,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
  image?: "people" | "corridor";
}) {
  return (
    <section className={`page-intro${image ? ` page-intro--image page-intro--${image}` : ""}`}>
      {image && <CliniciansIllustration priority decorative className="page-intro-image" sizes="(max-width: 639px) 100vw, 65vw" />}
      <div className="page-intro-copy">
      <nav aria-label="פירורי לחם" className="breadcrumb">
        <Link href="/">עמוד הבית</Link>
        <span aria-hidden="true">/</span>
        <span>{eyebrow ?? title}</span>
      </nav>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
      </div>
    </section>
  );
}
