import type { Metadata } from "next";
import { AnatomyApp } from "../components/AnatomyApp";
import { getAtlasContent } from "../content";
import { getI18n } from "../i18n/server";
import { organById, type OrganId } from "../lib/anatomy-data";
import { getCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.meta.atlas, description: m.meta.description };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AtlasPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, { locale }, user] = await Promise.all([searchParams, getI18n(), getCurrentUser()]);
  const organ = first(params.organ);
  const panel = first(params.panel);
  return (
    <AnatomyApp
      user={user}
      content={getAtlasContent(locale)}
      initialOrganId={organ && Object.hasOwn(organById, organ) ? (organ as OrganId) : "heart"}
      initialOverlay={panel === "plans" || panel === "encyclopedia" ? panel : null}
    />
  );
}
