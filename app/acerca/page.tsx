import type { Metadata } from "next";
import { AboutPage } from "../components/AboutPage";
import { getAtlasContent } from "../content";
import { getI18n } from "../i18n/server";
import { getCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.meta.about, description: m.about.lead };
}

export default async function AboutRoute() {
  const [{ locale, m }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  return <AboutPage m={m} content={getAtlasContent(locale)} signedIn={Boolean(user)} />;
}
