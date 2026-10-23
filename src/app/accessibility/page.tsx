import { PolicyPage } from "@/components/content/policy-page";
import policies from "@/content/legal-policies.json";

export const metadata = {
  title: `${policies.accessibility.title} | Hitmachut.org`,
  description: policies.accessibility.description,
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return <PolicyPage document={policies.accessibility} />;
}
