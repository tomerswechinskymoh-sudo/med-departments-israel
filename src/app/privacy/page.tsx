import { StaticPage } from "@/components/content/static-page";
import { staticPages } from "@/lib/static-pages";

export default function PrivacyPage() {
  return <StaticPage {...staticPages.privacy} />;
}
