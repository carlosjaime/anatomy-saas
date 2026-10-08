import type { Organ, OrganId } from "../lib/anatomy-data";
import type { ArticleSectionId, GlossaryEntry, OrganArticle, StudyGuide } from "../lib/encyclopedia-data";

/** Campos de texto de un órgano; la geometría y los recursos son comunes a todos los idiomas. */
export type OrganText = Pick<
  Organ,
  | "name"
  | "system"
  | "description"
  | "poetic"
  | "size"
  | "weight"
  | "location"
  | "function"
  | "dailyFact"
  | "medical"
  | "bloodSupply"
  | "funFact"
  | "tissue"
  | "comparison"
  | "conditions"
> & {
  quiz: Pick<Organ["quiz"], "question" | "options" | "explanation">;
  hotspots: Record<string, { label: string; detail: string }>;
};

export type ArticleText = Pick<OrganArticle, "etymology" | "sections">;

export type MotionText = { label: string; description: string };

/** Todo el contenido que necesita el atlas en un idioma; serializable para viajar al cliente. */
export type AtlasContent = {
  organs: Organ[];
  articles: Record<OrganId, OrganArticle>;
  sections: { id: ArticleSectionId; title: string }[];
  glossary: GlossaryEntry[];
  guides: Record<OrganId, StudyGuide>;
  motion: Record<OrganId, MotionText>;
};
