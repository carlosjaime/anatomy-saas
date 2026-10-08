/**
 * Reproduce de nuevo una animación de Animate.css sobre un elemento sin
 * remontarlo (remontar perdería el foco y el estado de los campos).
 */
export function replayAnimation(element: HTMLElement | null, name: string): void {
  if (!element) return;
  const className = `animate__${name}`;
  element.classList.remove("animate__animated", className);
  // Forzar un reflow reinicia la animación CSS.
  void element.offsetWidth;
  element.classList.add("animate__animated", className);
  element.addEventListener("animationend", () => element.classList.remove("animate__animated", className), { once: true });
}
