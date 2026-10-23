import { PolicyPage } from "@/components/content/policy-page";
import policies from "@/content/legal-policies.json";

export const metadata = {
  title: `${policies.terms.title} | Hitmachut.org`,
  description: policies.terms.description,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <PolicyPage document={policies.terms} />;
}
