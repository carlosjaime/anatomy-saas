"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AtlasContent } from "../../content/types";
import type { Organ, OrganId } from "../../lib/anatomy-data";

type AtlasContentValue = AtlasContent & { organById: Record<OrganId, Organ>; systems: string[] };

const AtlasContentContext = createContext<AtlasContentValue | null>(null);

/**
 * Contenido del atlas en el idioma activo, recibido del servidor. Al cambiar
 * de idioma llega uno nuevo vía `router.refresh()` y todo el árbol se
 * actualiza sin perder estado.
 */
export function AtlasContentProvider({ content, children }: { content: AtlasContent; children: ReactNode }) {
  const value = useMemo<AtlasContentValue>(
    () => ({
      ...content,
      organById: Object.fromEntries(content.organs.map((organ) => [organ.id, organ])) as Record<OrganId, Organ>,
      systems: Array.from(new Set(content.organs.map((organ) => organ.system))),
    }),
    [content],
  );
  return <AtlasContentContext.Provider value={value}>{children}</AtlasContentContext.Provider>;
}

export function useAtlasContent(): AtlasContentValue {
  const value = useContext(AtlasContentContext);
  if (!value) throw new Error("useAtlasContent debe usarse dentro de <AtlasContentProvider>.");
  return value;
}
