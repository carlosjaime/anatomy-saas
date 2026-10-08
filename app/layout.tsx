import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// Después de globals: las clases de Animate.css deben ganar a las animaciones base.
import "./styles/animate-subset.css";
import { Providers } from "./components/Providers";
import { getI18n } from "./i18n/server";

// A clinical, highly legible UI face — the same family of type used across
// modern medical and health-tech products.
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

// A serif built for extended reading (used in academic and medical
// publishing), standing in for the previous decorative display serif.
const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 675,
  alt: "Una pieza anatómica de un corazón flotando sobre un pedestal, junto al logotipo de Atlas Anatómico",
};

/**
 * Absolute URLs for og:image and friends. Resolved per host so a preview
 * deployment does not advertise another origin's assets:
 *   1. NEXT_PUBLIC_SITE_URL — explicit override, wins everywhere
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's stable production domain
 *   3. the original Cloudflare/OpenAI host
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://anatomy-atelier.openai.site");

export async function generateMetadata(): Promise<Metadata> {
  const { locale, m } = await getI18n();
  return {
    metadataBase: new URL(siteUrl),
    title: m.meta.title,
    description: m.meta.description,
    applicationName: m.brand.name,
    keywords:
      locale === "en-US"
        ? ["anatomy", "3D anatomy", "human body", "medical education", "interactive learning", "organs", "medical platform"]
        : ["anatomía", "anatomía 3D", "cuerpo humano", "educación médica", "aprendizaje interactivo", "órganos", "plataforma médica"],
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon.svg",
      apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    },
    alternates: { languages: { "es-MX": "/", "en-US": "/" } },
    openGraph: {
      type: "website",
      siteName: m.brand.name,
      locale: locale.replace("-", "_"),
      title: m.meta.title,
      description: m.meta.description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: m.meta.title, description: m.meta.description, images: [OG_IMAGE] },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b7a8a",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, m } = await getI18n();
  return (
    <html lang={locale}>
      <body className={`${sans.variable} ${serif.variable}`}>
        <Providers locale={locale} messages={m}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
