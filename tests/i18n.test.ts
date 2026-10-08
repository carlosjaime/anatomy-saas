import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES, isLocale, negotiateLocale } from "../app/i18n/config.ts";
import { format, plural } from "../app/i18n/format.ts";
import { getMessages } from "../app/i18n/messages/index.ts";
import { localeFromRequest } from "../app/i18n/server.ts";
import { validateEmail, validatePassword, validateRegistration } from "../app/lib/validation.ts";

type Tree = { [key: string]: unknown };

/** Aplana el diccionario a `ruta → texto` para comparar idiomas. */
function flatten(value: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof value === "string") out.set(prefix, value);
  else if (Array.isArray(value)) value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, out));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Tree)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test("both dictionaries expose the same keys and placeholders", () => {
  const es = flatten(getMessages("es-MX"));
  const en = flatten(getMessages("en-US"));
  assert.deepEqual([...en.keys()].sort(), [...es.keys()].sort());
  for (const [key, text] of es) {
    const english = en.get(key) ?? "";
    assert.ok(english.trim().length > 0, `en-US.${key} is empty`);
    assert.deepEqual(placeholders(english), placeholders(text), `placeholders differ in ${key}`);
  }
});

test("English dictionary is actually translated", () => {
  const es = flatten(getMessages("es-MX"));
  const en = flatten(getMessages("en-US"));
  // Nombres propios y plantillas sin texto propio son iguales en ambos idiomas.
  const sameByDesign = new Set(["brand.name", "dashboard.greeting", "game.combo", "game.points", "game.feedbackPlaced"]);
  const identical = [...es].filter(([key, text]) => text.length > 12 && en.get(key) === text && !sameByDesign.has(key)).map(([key]) => key);
  assert.deepEqual(identical, []);
});

test("negotiateLocale honours q-weights and falls back to es-MX", () => {
  assert.equal(negotiateLocale(null), "es-MX");
  assert.equal(negotiateLocale("en-GB,en;q=0.9"), "en-US");
  assert.equal(negotiateLocale("fr-FR,en;q=0.4,es;q=0.8"), "es-MX");
  assert.equal(negotiateLocale("de-DE,fr;q=0.5"), "es-MX");
  assert.equal(negotiateLocale("en;q=0, es-AR"), "es-MX");
  assert.ok(LOCALES.every(isLocale));
  assert.equal(isLocale("pt-BR"), false);
});

test("localeFromRequest prefers the cookie over Accept-Language", () => {
  const withCookie = new Request("https://x.test/api", { headers: { cookie: "a=1; atlas_locale=en-US", "accept-language": "es-MX" } });
  assert.equal(localeFromRequest(withCookie), "en-US");
  const invalidCookie = new Request("https://x.test/api", { headers: { cookie: "atlas_locale=xx", "accept-language": "en-US" } });
  assert.equal(localeFromRequest(invalidCookie), "en-US");
});

test("format and plural interpolate safely", () => {
  assert.equal(format("Hola {name}, {n} días", { name: "Ana", n: 3 }), "Hola Ana, 3 días");
  assert.equal(format("Sin {missing}"), "Sin {missing}");
  assert.equal(plural("en-US", 1, { one: "{count} day", other: "{count} days" }), "1 day");
  assert.equal(plural("es-MX", 4, { one: "{count} día", other: "{count} días" }), "4 días");
});

test("validation messages follow the active language", () => {
  const es = getMessages("es-MX").validation;
  const en = getMessages("en-US").validation;
  assert.equal(validateEmail("", en), en.emailRequired);
  assert.equal(validateEmail("bad@", es), es.emailInvalid);
  assert.equal(validatePassword("short1", en), format(en.passwordMin, { min: 10 }));
  const result = validateRegistration({ name: "A", email: "x", password: "abc", role: "nope", terms: false }, en);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.name, en.nameRequired);
    assert.equal(result.errors.terms, en.termsRequired);
    assert.equal(result.errors.role, en.roleRequired);
  }
});
