/**
 * Se vuelve a montar en cada navegación, así que su animación de entrada
 * funciona como transición entre páginas (sin JavaScript extra).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
