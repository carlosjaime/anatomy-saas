import { organs as baseOrgans, type Organ, type OrganId } from "../lib/anatomy-data";
import { ARTICLE_SECTIONS, articles as baseArticles, glossary as baseGlossary, studyGuides as baseGuides, type OrganArticle } from "../lib/encyclopedia-data";
import { MOTION_BY_ORGAN } from "../lib/three/motion";
import type { Locale } from "../i18n/config";
import { articlesEnUS } from "./en-US/articles";
import { glossaryEnUS } from "./en-US/glossary";
import { guidesEnUS } from "./en-US/guides";
import { motionEnUS, sectionTitlesEnUS } from "./en-US/misc";
import { organsEnUS } from "./en-US/organs";
import type { AtlasContent } from "./types";

export type { AtlasContent } from "./types";

/** Aplica los textos traducidos sobre la geometría común de cada órgano. */
function localizeOrgan(organ: Organ, locale: Locale): Organ {
  if (locale === "es-MX") return organ;
  const text = organsEnUS[organ.id];
  return {
    ...organ,
    ...text,
    quiz: { ...organ.quiz, ...text.quiz },
    hotspots: organ.hotspots.map((hotspot) => ({ ...hotspot, ...text.hotspots[hotspot.id] })),
  };
}

const cache = new Map<Locale, AtlasContent>();

/**
 * Contenido del atlas en el idioma pedido. Se usa solo en servidor y se pasa
 * al cliente como props, de modo que el bundle JS no incluye ningún idioma.
 */
export function getAtlasContent(locale: Locale): AtlasContent {
  const cached = cache.get(locale);
  if (cached) return cached;
  const english = locale === "en-US";
  const articles = Object.fromEntries(
    Object.entries(baseArticles).map(([id, article]) => [
      id,
      english ? ({ ...article, ...articlesEnUS[id as OrganId] } satisfies OrganArticle) : article,
    ]),
  ) as Record<OrganId, OrganArticle>;
  const content: AtlasContent = {
    organs: baseOrgans.map((organ) => localizeOrgan(organ, locale)),
    articles,
    sections: ARTICLE_SECTIONS.map(({ id, title }) => ({ id, title: english ? sectionTitlesEnUS[id] : title })),
    glossary: [...(english ? glossaryEnUS : baseGlossary)],
    guides: english ? guidesEnUS : baseGuides,
    motion: english
      ? motionEnUS
      : (Object.fromEntries(Object.entries(MOTION_BY_ORGAN).map(([id, { label, description }]) => [id, { label, description }])) as AtlasContent["motion"]),
  };
  cache.set(locale, content);
  return content;
}
