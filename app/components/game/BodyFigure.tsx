import { BODY_VIEWBOX, REGION_IDS, REGION_SHAPES, type RegionId, type Shape } from "../../lib/game/body-map";

export type RegionTone = "hover" | "hint" | "correct" | "partial" | "wrong";

type Props = {
  /** Contorno punteado de las regiones evaluables (modo guiado). */
  showGuides?: boolean;
  highlights?: Partial<Record<RegionId, RegionTone>>;
  sideLabels: { right: string; left: string; rightTitle: string; leftTitle: string };
  title: string;
  /** Prefijo de los ids de <defs>; único por figura en la página. */
  idPrefix?: string;
  className?: string;
};

const { width: W, height: H } = BODY_VIEWBOX;

/** Las extremidades y la cara no se dibujan como guía: serían ruido visual. */
const GUIDE_REGIONS = REGION_IDS.filter((id) => id !== "limbs" && id !== "face");

function ShapeOutline({ shape, className }: { shape: Shape; className: string }) {
  if (shape.kind === "ellipse") return <ellipse className={className} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
  if (shape.kind === "rect") return <rect className={className} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={6} />;
  return <line className={`${className} capsule`} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} strokeWidth={shape.r * 2} />;
}

/**
 * Figura humana anatómica en vista anterior, recortada a medio muslo.
 * Las formas de las regiones salen de `REGION_SHAPES`: lo que se ve es
 * exactamente lo que se evalúa.
 */
export function BodyFigure({ showGuides = false, highlights = {}, sideLabels, title, idPrefix = "body", className = "" }: Props) {
  const uid = idPrefix;
  const skin = `skin-${uid}`;
  const sheen = `sheen-${uid}`;
  const outline = `outline-${uid}`;
  const fade = `fade-${uid}`;

  return (
    <svg className={`body-figure ${className}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
      <defs>
        <linearGradient id={skin} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf4ec" />
          <stop offset=".55" stopColor="#f3e6d8" />
          <stop offset="1" stopColor="#e8d6c4" />
        </linearGradient>
        <radialGradient id={sheen} cx=".42" cy=".3" r=".7">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={outline} x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="grown" />
          <feFlood floodColor="#0b7a8a" floodOpacity=".28" />
          <feComposite in2="grown" operator="in" result="stroke" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="blur" />
          <feOffset in="blur" dy="10" result="shadow" />
          <feFlood floodColor="#0e283e" floodOpacity=".14" />
          <feComposite in2="shadow" operator="in" result="softShadow" />
          <feMerge>
            <feMergeNode in="softShadow" />
            <feMergeNode in="stroke" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".86" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${fade}-mask`}>
          <rect width={W} height={H} fill={`url(#${fade})`} />
        </mask>
      </defs>
      <title>{title}</title>

      <g mask={`url(#${fade}-mask)`}>
        <g className="body-silhouette" filter={`url(#${outline})`} fill={`url(#${skin})`} stroke={`url(#${skin})`} strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="200" cy="80" rx="44" ry="54" />
          <rect x="182" y="120" width="36" height="62" rx="14" stroke="none" />
          <path
            stroke="none"
            d="M136 200 C138 184 154 176 176 174 L224 174 C246 176 262 184 264 200 L268 300 C268 340 262 372 256 404 C250 440 254 480 262 520 C268 552 266 580 258 604 L142 604 C134 580 132 552 138 520 C146 480 150 440 144 404 C138 372 132 340 132 300 Z"
          />
          {/* Brazos (segmentos con grosor) y manos; el lado izquierdo es un reflejo. */}
          {[1, -1].map((side) => {
            const x = (value: number) => (side === 1 ? value : W - value);
            return (
              <g key={side} fill="none">
                <path d={`M${x(146)} 200 L${x(114)} 390`} strokeWidth="40" />
                <path d={`M${x(114)} 390 L${x(98)} 552`} strokeWidth="32" />
                <ellipse cx={x(94)} cy="584" rx="17" ry="26" fill={`url(#${skin})`} stroke="none" />
                <path d={`M${x(170)} 600 L${x(166)} 760`} strokeWidth="52" />
              </g>
            );
          })}
        </g>
        <ellipse cx="186" cy="250" rx="120" ry="220" fill={`url(#${sheen})`} pointerEvents="none" />

        {/* Referencias anatómicas de superficie. */}
        <g className="body-landmarks" fill="none">
          <path d="M200 178 V600" strokeDasharray="3 6" />
          <path d="M150 192 C170 198 186 196 198 190 M250 192 C230 198 214 196 202 190" />
          {[0, 1, 2, 3, 4].map((index) => {
            const y = 222 + index * 26;
            const spread = 46 + index * 4;
            return <path key={index} d={`M${200 - spread} ${y + 16} Q200 ${y - 8} ${200 + spread} ${y + 16}`} opacity={0.7 - index * 0.08} />;
          })}
          <path d="M148 356 Q200 392 252 356" />
          <circle cx="200" cy="470" r="3.2" />
          <path d="M150 548 Q164 572 182 586 M250 548 Q236 572 218 586" />
        </g>
      </g>

      {showGuides && (
        <g className="region-guides" aria-hidden="true">
          {GUIDE_REGIONS.map((id) =>
            REGION_SHAPES[id].map((shape, index) => <ShapeOutline key={`${id}-${index}`} shape={shape} className="region-guide" />),
          )}
        </g>
      )}

      <g className="region-highlights" aria-hidden="true">
        {(Object.entries(highlights) as [RegionId, RegionTone][]).map(([id, tone]) =>
          REGION_SHAPES[id].map((shape, index) => <ShapeOutline key={`${id}-${index}-${tone}`} shape={shape} className={`region-highlight ${tone}`} />),
        )}
      </g>

      <g className="body-sides" aria-hidden="true">
        <text x="34" y="44"><title>{sideLabels.rightTitle}</title>{sideLabels.right}</text>
        <text x={W - 34} y="44" textAnchor="end"><title>{sideLabels.leftTitle}</title>{sideLabels.left}</text>
      </g>
    </svg>
  );
}
