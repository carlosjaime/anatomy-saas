"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_META, type Locale } from "./config";
import { format } from "./format";
import type { Messages } from "./messages/es-MX";

/** Duración del fundido de salida antes de pedir el nuevo idioma al servidor. */
const FADE_OUT_MS = 220;
const FADE_IN_MS = 420;
/** Red de seguridad: si el servidor no responde, la página nunca queda oculta. */
const SWITCH_TIMEOUT_MS = 8000;

type I18nValue = {
  locale: Locale;
  m: Messages;
  /** `format` atado al diccionario activo. */
  t: (template: string, vars?: Record<string, string | number>) => string;
  switchLocale: (next: Locale) => void;
  switching: boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * El diccionario llega del servidor como prop. Cambiar de idioma escribe la
 * cookie y pide un `router.refresh()`: el servidor vuelve a renderizar todo en
 * el nuevo idioma y React reconcilia el árbol sin perder el estado del cliente
 * (órgano seleccionado, diálogos abiertos, formularios…). Solo viaja el
 * diccionario activo, nunca ambos.
 */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<Locale | null>(null);
  const fadeTimer = useRef<number | undefined>(undefined);
  const safetyTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(fadeTimer.current);
      window.clearTimeout(safetyTimer.current);
    },
    [],
  );

  const switchLocale = useCallback(
    (next: Locale) => {
      if (next === locale || target) return;
      const root = document.documentElement;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTarget(next);
      root.classList.add("locale-leaving");
      window.clearTimeout(safetyTimer.current);
      safetyTimer.current = window.setTimeout(() => {
        root.classList.remove("locale-leaving", "locale-entering");
        setTarget(null);
      }, SWITCH_TIMEOUT_MS);
      window.setTimeout(() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
        root.lang = LOCALE_META[next].htmlLang;
        startTransition(() => router.refresh());
      }, reduced ? 0 : FADE_OUT_MS);
    },
    [locale, router, target],
  );

  // El fundido de entrada empieza cuando el servidor ya entregó el nuevo idioma.
  useEffect(() => {
    if (!target || isPending || locale !== target) return;
    const root = document.documentElement;
    window.clearTimeout(safetyTimer.current);
    root.classList.remove("locale-leaving");
    root.classList.add("locale-entering");
    // El temporizador vive en un ref: limpiar `target` vuelve a ejecutar este
    // efecto y no debe cancelar el fin del fundido.
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => root.classList.remove("locale-entering"), FADE_IN_MS);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cierre del ciclo de cambio de idioma
    setTarget(null);
    window.dispatchEvent(new CustomEvent("atlas:locale-changed", { detail: target }));
  }, [locale, isPending, target]);

  const value = useMemo<I18nValue>(
    () => ({ locale, m: messages, t: format, switchLocale, switching: target !== null }),
    [locale, messages, switchLocale, target],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n debe usarse dentro de <I18nProvider>.");
  return value;
}
