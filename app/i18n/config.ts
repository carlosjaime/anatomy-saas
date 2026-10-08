/** Idiomas soportados. El primero es el predeterminado. */
export const LOCALES = ["es-MX", "en-US"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es-MX";
export const LOCALE_COOKIE = "atlas_locale";
/** Un año: la preferencia de idioma es estable. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_META: Record<Locale, { label: string; short: string; flag: string; htmlLang: string }> = {
  "es-MX": { label: "Español (México)", short: "ES", flag: "🇲🇽", htmlLang: "es-MX" },
  "en-US": { label: "English (US)", short: "EN", flag: "🇺🇸", htmlLang: "en-US" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Elige el idioma a partir de `Accept-Language` respetando los pesos `q`.
 * Cualquier variante de inglés cae en en-US y cualquier español en es-MX.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag.startsWith("es")) return "es-MX";
    if (tag.startsWith("en")) return "en-US";
  }
  return DEFAULT_LOCALE;
}
