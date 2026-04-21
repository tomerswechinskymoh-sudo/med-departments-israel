import { StaticPage } from "@/components/content/static-page";
import { staticPages } from "@/lib/static-pages";

export default function AccessibilityPage() {
  return <StaticPage {...staticPages.accessibility} />;
}
