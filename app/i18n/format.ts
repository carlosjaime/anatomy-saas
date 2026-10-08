/**
 * Interpolación mínima `{nombre}` sobre plantillas de texto. Los mensajes son
 * cadenas planas (serializables) para poder viajar del servidor al cliente.
 */
export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Plural simple: `{ one, other }` según Intl.PluralRules del idioma. */
export function plural(locale: string, count: number, forms: { one: string; other: string }): string {
  const rule = new Intl.PluralRules(locale).select(count);
  return format(rule === "one" ? forms.one : forms.other, { count });
}
