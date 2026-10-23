import { notFound } from "next/navigation";
export const metadata = { robots: { index: false, follow: false } };
/** Public recruitment retired; historical accounts, operations and APIs are preserved. */
export default function RetiredPublicPage() { notFound(); }
