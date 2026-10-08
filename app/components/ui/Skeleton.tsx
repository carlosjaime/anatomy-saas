import { BrandMark } from "../BrandMark";

type Variant = "atlas" | "dashboard" | "account";

/**
 * Esqueleto de carga para `loading.tsx`: se muestra al instante durante la
 * navegación mientras el servidor resuelve la página (streaming).
 */
export function PageSkeleton({ variant, label }: { variant: Variant; label: string }) {
  return (
    <div className={`page-skeleton skeleton-${variant}`} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {variant === "atlas" ? (
        <div className="skeleton-atlas-stage" aria-hidden="true">
          <span className="skeleton-pulse"><BrandMark size={64} /></span>
          <p>{label}</p>
        </div>
      ) : (
        <div className="skeleton-dash" aria-hidden="true">
          <i className="sk sk-side" />
          <div className="skeleton-dash-main">
            <i className="sk sk-title" />
            <i className="sk sk-text" />
            <div className="skeleton-row">
              {Array.from({ length: variant === "dashboard" ? 4 : 2 }, (_, index) => (
                <i key={index} className="sk sk-card" style={{ "--i": index } as React.CSSProperties} />
              ))}
            </div>
            <i className="sk sk-block" />
          </div>
        </div>
      )}
    </div>
  );
}
