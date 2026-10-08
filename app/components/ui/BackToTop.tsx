"use client";

import { ArrowUp } from "lucide-react";

/**
 * Desplazamiento suave solo en esta acción explícita (no global): un
 * `scroll-behavior: smooth` en <html> también animaría los desplazamientos
 * programáticos y de accesibilidad.
 */
export function BackToTop({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="footer-top"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
    >
      <ArrowUp size={14} /> {label}
    </button>
  );
}
