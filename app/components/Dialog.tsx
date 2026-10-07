"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Debe coincidir con la duración de `dialog-out` / `sheet-out` en globals.css. */
const EXIT_MS = 220;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Presence = "open" | "closing" | "closed";

const noopSubscribe = () => () => {};

/**
 * `false` en el servidor y durante la hidratación, `true` después. Evita que
 * un diálogo abierto desde el primer render (p. ej. `?panel=plans`) genere un
 * portal en el cliente que el HTML del servidor no tenía.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Mantiene el contenido montado durante la animación de salida. Sin esto, un
 * desmontaje inmediato corta la transición y el cierre se percibe brusco.
 */
function usePresence(open: boolean): Presence {
  const [presence, setPresence] = useState<Presence>(open ? "open" : "closed");

  // Ajuste de estado derivado durante el render (patrón recomendado por React
  // para sincronizar estado con props sin un efecto adicional).
  if (open && presence !== "open") setPresence("open");
  if (!open && presence === "open") setPresence("closing");

  useEffect(() => {
    if (presence !== "closing") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPresence("closed"), reduced ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [presence]);

  return presence;
}

/** Contador global: varios diálogos anidados comparten un único bloqueo. */
let scrollLocks = 0;

function lockScroll() {
  scrollLocks += 1;
  if (scrollLocks > 1) return;
  // Compensa el ancho de la barra de scroll para evitar un salto del layout.
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = "hidden";
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0) return;
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  /** `center` para diálogos compactos, `wide` para contenido amplio y
   *  `fullscreen` para vistas de navegación como la enciclopedia. */
  variant?: "center" | "wide" | "fullscreen";
  className?: string;
  /** Selector del elemento que recibe el foco al abrir. */
  initialFocus?: string;
  hideCloseButton?: boolean;
  children: ReactNode;
};

export function Dialog({
  open,
  onClose,
  labelledBy,
  variant = "center",
  className = "",
  initialFocus,
  hideCloseButton = false,
  children,
}: Props) {
  const presence = usePresence(open);
  const isClient = useIsClient();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const mounted = presence !== "closed" && isClient;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    lockScroll();

    const target = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel;
    target?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!panel) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Focus trap: el foco cicla dentro del diálogo mientras está abierto.
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [mounted, initialFocus]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`modal-backdrop variant-${variant}`}
      data-state={presence}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className={`dialog-panel variant-${variant} ${className}`}
        data-state={presence}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <span className="sheet-handle" aria-hidden="true" />
        {!hideCloseButton && (
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        )}
        {children}
      </section>
    </div>,
    document.body,
  );
}
