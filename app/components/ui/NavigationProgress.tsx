"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progreso superior para navegaciones. Arranca al hacer clic en un
 * enlace interno (o al emitir `atlas:navigation-start`) y termina cuando la
 * URL cambia. Avanza de forma asintótica para no "llegar" antes de tiempo.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => {
    const start = () => {
      window.clearInterval(timer.current);
      setProgress(0.08);
      timer.current = window.setInterval(() => setProgress((value) => (value === null ? null : value + (0.9 - value) * 0.12)), 180);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("atlas:navigation-start", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("atlas:navigation-start", start);
      window.clearInterval(timer.current);
    };
  }, []);

  // La nueva ruta ya se pintó: completar y desvanecer.
  useEffect(() => {
    window.clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- respuesta a un cambio de URL externo a React
    setProgress((value) => (value === null ? null : 1));
    const done = window.setTimeout(() => setProgress(null), 320);
    return () => window.clearTimeout(done);
  }, [pathname, searchParams]);

  return (
    <div className={`nav-progress ${progress === null ? "" : "active"}`} aria-hidden="true">
      <i style={{ transform: `scaleX(${progress ?? 0})` }} />
    </div>
  );
}

export function startNavigationProgress() {
  window.dispatchEvent(new Event("atlas:navigation-start"));
}
