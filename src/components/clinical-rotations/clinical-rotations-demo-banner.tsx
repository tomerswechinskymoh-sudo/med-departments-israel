import { headers } from "next/headers";

export async function ClinicalRotationsDemoBanner() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const isLocalhost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");

  if (!isLocalhost) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-black text-amber-900">
      סביבת הדגמה מקומית - אין להשתמש בנתונים אמיתיים
    </div>
  );
}
