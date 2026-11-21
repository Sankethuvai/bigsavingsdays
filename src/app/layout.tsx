import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { publicBaseUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});
const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicBaseUrl() ?? "https://bigsavingsdays.com"),
  title: {
    default: "BigSavingsDays — The High-Converting Deal & Affiliate Link Platform",
    template: "%s · BigSavingsDays",
  },
  description:
    "BigSavingsDays is the high-converting deal, coupon, and affiliate link platform. Shorten product links, create deals bio pages, share verified discount badges, copy coupons automatically, and track revenue clicks.",
  keywords: [
    "deal links",
    "affiliate url shortener",
    "discount shortener",
    "coupon links",
    "deals hub",
    "deals bio page",
    "amazon affiliate links",
    "telegram deals shortener",
    "custom domains",
  ],
  openGraph: {
    title: "BigSavingsDays — The High-Converting Deal & Affiliate Link Platform",
    description: "Branded deal links, deals bio pages, coupon codes, and live click analytics for creators and affiliate marketers.",
    type: "website",
    siteName: "BigSavingsDays",
  },
  twitter: { card: "summary_large_image", title: "BigSavingsDays — The High-Converting Deal & Affiliate Link Platform" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://bigsavingsdays.com/#organization",
      "name": "BigSavingsDays",
      "url": "https://bigsavingsdays.com",
      "logo": "https://bigsavingsdays.com/icon.svg",
      "description": "The high-converting deal, coupon, and affiliate link platform for creators, Telegram channels, and shopping communities.",
      "sameAs": [
        "https://twitter.com/bigsavingsdays",
        "https://t.me/bigsavingsdays"
      ]
    },
    {
      "@type": "WebApplication",
      "@id": "https://bigsavingsdays.com/#webapp",
      "name": "BigSavingsDays Deal Platform",
      "url": "https://bigsavingsdays.com",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Branded deal short links with discount badges",
        "Deals Hub mobile storefront pages",
        "1-click coupon code copy buttons",
        "Automatic affiliate tag and UTM preservation",
        "Real-time traffic channel analytics"
      ]
    }
  ]
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = (jar.get("bsd-theme")?.value ?? jar.get("velo-theme")?.value) === "dark" ? "dark" : "light";

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Context" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={`${inter.variable} ${bricolage.variable} ${instrument.variable}`}>
        {children}
      </body>
    </html>
  );
}
