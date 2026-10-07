import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Atlas Anatómico — Anatomía clínica 3D para medicina",
  description:
    "Explora órganos en 3D con precisión médica —corazón, cerebro, pulmones, hígado, riñones, ojo, intestino, páncreas y piel— en una plataforma interactiva pensada para el aprendizaje clínico.",
  applicationName: "Atlas Anatómico",
  keywords: ["anatomía", "anatomía 3D", "cuerpo humano", "educación médica", "aprendizaje interactivo", "órganos", "plataforma médica"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    siteName: "Atlas Anatómico",
    title: "Atlas Anatómico — Anatomía 3D para estudiantes y profesionales de la salud",
    description: "Aprende anatomía con precisión clínica a través de especímenes 3D interactivos.",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlas Anatómico — Anatomía 3D para estudiantes y profesionales de la salud",
    description: "Aprende anatomía con precisión clínica a través de especímenes 3D interactivos.",
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b7a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${sans.variable} ${serif.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
