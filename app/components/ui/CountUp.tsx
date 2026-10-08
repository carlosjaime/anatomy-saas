"use client";

import { useEffect, useRef } from "react";

/**
 * Número que cuenta desde 0 al entrar en pantalla. El HTML del servidor ya
 * trae el valor final (sin parpadeo ni desajuste de hidratación); la animación
 * escribe directamente en el DOM para no re-renderizar en cada fotograma.
 */
export function CountUp({ value, duration = 1100, format }: { value: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const render = format ?? ((n: number) => String(Math.round(n)));

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        node.textContent = render(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      run();
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // `render` es estable para un mismo `format`; se ignora para no reiniciar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span ref={ref}>{render(value)}</span>;
}
