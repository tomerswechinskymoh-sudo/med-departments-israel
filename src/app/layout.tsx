import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteIdentity } from "@/lib/brand-copy";

const pageTitle = `${siteIdentity.name} | ${siteIdentity.descriptor}`;
const pageDescription =
  "השוואת מחלקות והתמחויות בישראל לסטודנטים, סטאז׳רים ומתמחים. נתונים ממקורות רשמיים, בתי חולים ודיווחים מהשטח.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hitmachut.org"),
  applicationName: siteIdentity.name,
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    locale: "he_IL",
    type: "website",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: siteIdentity.name }]
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/opengraph-image.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className="text-ink">
        <div className="min-h-screen">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
