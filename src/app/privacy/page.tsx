import { PolicyPage } from "@/components/content/policy-page";
import policies from "@/content/legal-policies.json";

export const metadata = {
  title: `${policies.privacy.title} | Hitmachut.org`,
  description: policies.privacy.description,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PolicyPage document={policies.privacy} />;
}
