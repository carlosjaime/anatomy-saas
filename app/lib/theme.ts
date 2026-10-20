/** Preferencia de tema. `system` sigue `prefers-color-scheme`. */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "atlas_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseTheme(value: unknown): Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value) ? (value as Theme) : "system";
}

/** Valor de `data-theme` en `<html>`; `undefined` deja decidir al sistema. */
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}

/** Aplica el tema en el documento y lo persiste (solo navegador). */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const attribute = themeAttribute(theme);
  if (attribute) root.dataset.theme = attribute;
  else delete root.dataset.theme;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}
