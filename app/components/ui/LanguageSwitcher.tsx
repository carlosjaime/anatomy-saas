"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, Loader2 } from "lucide-react";
import { LOCALES, LOCALE_META, type Locale } from "../../i18n/config";
import { useI18n } from "../../i18n/client";

/** Selector de idioma accesible (listbox) con cambio en tiempo real. */
export function LanguageSwitcher({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { locale, m, switchLocale, switching } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // En captura y sin propagar: Escape cierra solo el menú, no el modal que lo contiene.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const choose = (next: Locale) => {
    setOpen(false);
    switchLocale(next);
  };

  const meta = LOCALE_META[locale];
  return (
    <div className={`lang-switcher ${compact ? "compact" : ""} ${className}`} ref={rootRef}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${m.language.change}: ${meta.label}`}
        onClick={() => setOpen((value) => !value)}
        disabled={switching}
        data-testid="language-switcher"
      >
        {switching ? <Loader2 size={15} className="spin" /> : <Globe2 size={15} />}
        <span className="lang-flag" aria-hidden="true">{meta.flag}</span>
        {!compact && <span className="lang-code">{meta.short}</span>}
        <ChevronDown size={13} className={open ? "chevron open" : "chevron"} />
      </button>
      {open && (
        <ul className="lang-menu animate__animated animate__fadeInDown" role="listbox" id={listId} aria-label={m.language.label}>
          {LOCALES.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === locale}
                lang={LOCALE_META[option].htmlLang}
                onClick={() => choose(option)}
                data-testid={`locale-${option}`}
              >
                <span className="lang-flag" aria-hidden="true">{LOCALE_META[option].flag}</span>
                <span>{LOCALE_META[option].label}</span>
                {option === locale && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
