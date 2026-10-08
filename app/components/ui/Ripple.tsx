"use client";

import { useEffect } from "react";

const SELECTOR = ".btn, .lesson-button, .tour-cta, .tour-launch, .plan-card button, .main-nav button, .mobile-tabbar button, .tool-button, .deck-actions button";

/**
 * Efecto ripple (Material) para botones principales mediante un único listener
 * delegado: sin envolver cada botón ni re-renderizar React.
 */
export function Ripple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onPointerDown = (event: PointerEvent) => {
      const host = (event.target as HTMLElement | null)?.closest<HTMLElement>(SELECTOR);
      if (!host || host.matches(":disabled")) return;
      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      // La onda vive en una capa recortada propia: el botón no necesita
      // `overflow: hidden` (que cortaría insignias o tooltips).
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      const clip = document.createElement("span");
      clip.className = "ripple-clip";
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      clip.appendChild(ripple);
      host.appendChild(clip);
      ripple.addEventListener("animationend", () => clip.remove(), { once: true });
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return null;
}
