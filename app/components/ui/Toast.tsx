"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useI18n } from "../../i18n/client";

export type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; message: string; leaving: boolean; duration: number };
type ToastApi = {
  show: (message: string, tone?: ToastTone, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const MAX_TOASTS = 4;
const EXIT_MS = 420;
/** Mensaje que sobrevive a una navegación completa (p. ej. tras iniciar sesión). */
const FLASH_KEY = "atlas:flash";

/** Programa un toast para mostrarse en la siguiente página cargada. */
export function flashToast(message: string, tone: ToastTone = "success") {
  try {
    window.sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, tone }));
  } catch {
    // Sin almacenamiento: el toast simplemente no se muestra.
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const languageMessage = useRef(m.language.changed);
  useEffect(() => {
    languageMessage.current = m.language.changed;
  }, [m.language.changed]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), EXIT_MS);
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "info", duration = 4200) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-(MAX_TOASTS - 1)), { id, tone, message, leaving: false, duration }]);
  }, []);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(FLASH_KEY);
      if (raw) {
        window.sessionStorage.removeItem(FLASH_KEY);
        const flash = JSON.parse(raw) as { message?: unknown; tone?: unknown };
        if (typeof flash.message === "string") {
          show(flash.message, flash.tone === "error" || flash.tone === "info" ? flash.tone : "success");
        }
      }
    } catch {
      // Ignorar mensajes corruptos.
    }
    // El aviso de idioma se emite cuando ya llegó el nuevo diccionario.
    const onLocale = () => window.setTimeout(() => show(languageMessage.current, "info", 3200), 60);
    window.addEventListener("atlas:locale-changed", onLocale);
    return () => window.removeEventListener("atlas:locale-changed", onLocale);
  }, [show]);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error", 6000),
      info: (message) => show(message, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section className="toast-region" aria-live="polite" aria-label={m.common.notifications}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} dismissLabel={m.common.dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss, dismissLabel }: { toast: Toast; onDismiss: () => void; dismissLabel: string }) {
  const [paused, setPaused] = useState(false);
  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? AlertCircle : Info;
  return (
    <div
      className={`toast toast-${toast.tone} animate__animated ${toast.leaving ? "animate__fadeOutRight" : "animate__backInUp"}`}
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={18} className={toast.tone === "success" ? "animate__animated animate__bounceIn" : undefined} />
      <p>{toast.message}</p>
      <button type="button" onClick={onDismiss} aria-label={dismissLabel}><X size={14} /></button>
      <span
        className="toast-timer"
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
        onAnimationEnd={onDismiss}
      />
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return api;
}
