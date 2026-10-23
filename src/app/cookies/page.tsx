import { PolicyPage } from "@/components/content/policy-page";
import policies from "@/content/legal-policies.json";

export const metadata = {
  title: `${policies.cookies.title} | Hitmachut.org`,
  description: policies.cookies.description,
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return <PolicyPage document={policies.cookies} />;
}
