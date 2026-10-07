"use client";

import { useEffect } from "react";

/**
 * Activa las animaciones de entrada al hacer scroll para todo elemento con
 * `data-animate`. Un solo IntersectionObserver para toda la página; sin
 * JavaScript (o con movimiento reducido) el contenido es visible desde el
 * inicio porque el estado oculto solo aplica bajo `.js-reveal`.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    root.classList.add("js-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-animate]").forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}
