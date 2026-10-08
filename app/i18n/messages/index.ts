import enUS from "./en-US";
import esMX, { type Messages } from "./es-MX";
import type { Locale } from "../config";

export type { Messages };

const DICTIONARIES: Record<Locale, Messages> = { "es-MX": esMX, "en-US": enUS };

/** Uso exclusivo en servidor: el cliente recibe solo el diccionario activo. */
export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale];
}
