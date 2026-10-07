/**
 * Isotipo: una cruz médica con trazo de ECG. SVG en línea para que herede el
 * color del tema y no cueste una petición extra.
 */
export function BrandMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="38" height="38" rx="11" className="brand-mark-bg" />
      <path
        d="M16 9.5h8v6.5h6.5v8H24v6.5h-8V24H9.5v-8H16z"
        className="brand-mark-cross"
      />
      <path
        d="M6 21h7.2l2.3-4.6 3.6 9.2 3-7.1 1.7 2.5H34"
        className="brand-mark-pulse"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <BrandMark size={compact ? 30 : 34} />
      <span className="brand-words">
        <strong>Atlas Anatómico</strong>
        {!compact && <small>Anatomía clínica 3D</small>}
      </span>
    </span>
  );
}
