import type { Metadata } from "next";
import { AnatomyApp } from "../components/AnatomyApp";
import { organById, type OrganId } from "../lib/anatomy-data";
import { getCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atlas 3D — Atlas Anatómico",
  description: "Visor anatómico 3D con recorridos guiados, fisiología animada y enciclopedia clínica.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AtlasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const organ = first(params.organ);
  const panel = first(params.panel);
  return (
    <AnatomyApp
      user={await getCurrentUser()}
      initialOrganId={organ && Object.hasOwn(organById, organ) ? (organ as OrganId) : "heart"}
      initialOverlay={panel === "plans" || panel === "encyclopedia" ? panel : null}
    />
  );
}
