import { StaticPage } from "@/components/content/static-page";
import { staticPages } from "@/lib/static-pages";

export default function TermsPage() {
  return <StaticPage {...staticPages.terms} />;
}
