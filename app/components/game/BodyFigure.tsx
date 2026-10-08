import { BODY_VIEWBOX, REGION_IDS_BY_VIEW, REGION_SHAPES, type RegionId, type Shape, type View } from "../../lib/game/body-map";

export type RegionTone = "hover" | "hint" | "correct" | "partial" | "wrong";

type Props = {
  /** Anterior: vemos al paciente de frente. Posterior: vemos su espalda. */
  view?: View;
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
const HIDDEN_GUIDES = new Set<RegionId>(["limbs", "backLimbs", "face"]);
const GUIDE_REGIONS: Record<View, readonly RegionId[]> = {
  anterior: REGION_IDS_BY_VIEW.anterior.filter((id) => !HIDDEN_GUIDES.has(id)),
  posterior: REGION_IDS_BY_VIEW.posterior.filter((id) => !HIDDEN_GUIDES.has(id)),
};

/** Referencias de superficie de la cara anterior: clavículas, parrilla costal, ombligo, ingles. */
function AnteriorLandmarks() {
  return (
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
      <path d="M186 104 Q200 112 214 104" opacity=".55" />
    </g>
  );
}

/** Referencias de la cara posterior: apófisis espinosas, escápulas, costillas flotantes, crestas ilíacas y pliegue glúteo. */
function PosteriorLandmarks() {
  return (
    <g className="body-landmarks" fill="none">
      {Array.from({ length: 22 }, (_, index) => {
        const y = 150 + index * 19.5;
        return <path key={index} d={`M196 ${y} H204`} strokeWidth="2.2" opacity={0.75 - index * 0.012} />;
      })}
      <path d="M150 206 L184 214 L176 290 Q160 282 150 206 Z M250 206 L216 214 L224 290 Q240 282 250 206 Z" opacity=".75" />
      <path d="M158 214 C168 220 176 222 184 220 M242 214 C232 220 224 222 216 220" opacity=".5" />
      <path d="M146 392 Q168 404 190 400 M254 392 Q232 404 210 400" opacity=".6" />
      <path d="M140 520 Q170 500 196 512 M260 520 Q230 500 204 512" />
      <path d="M200 548 V604" />
      <path d="M146 598 Q172 610 196 600 M254 598 Q228 610 204 600" />
      <circle cx="182" cy="540" r="2.6" />
      <circle cx="218" cy="540" r="2.6" />
    </g>
  );
}

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
export function BodyFigure({ view = "anterior", showGuides = false, highlights = {}, sideLabels, title, idPrefix = "body", className = "" }: Props) {
  // Desde atrás, el lado derecho del paciente queda a la derecha del observador.
  const leftSide = view === "anterior" ? { text: sideLabels.right, title: sideLabels.rightTitle } : { text: sideLabels.left, title: sideLabels.leftTitle };
  const rightSide = view === "anterior" ? { text: sideLabels.left, title: sideLabels.leftTitle } : { text: sideLabels.right, title: sideLabels.rightTitle };
  const uid = idPrefix;
  const skin = `skin-${uid}`;
  const sheen = `sheen-${uid}`;
  const outline = `outline-${uid}`;
  const fade = `fade-${uid}`;

  return (
    <svg className={`body-figure ${view} ${className}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
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
          <ellipse cx="156" cy="92" rx="7" ry="13" />
          <ellipse cx="244" cy="92" rx="7" ry="13" />
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

        {view === "posterior" && (
          <path className="body-hair" d="M157 74 C156 38 176 24 200 24 C224 24 244 38 243 74 C240 96 232 112 222 122 C208 116 192 116 178 122 C168 112 160 96 157 74 Z" />
        )}
        {view === "anterior" ? <AnteriorLandmarks /> : <PosteriorLandmarks />}
      </g>

      {showGuides && (
        <g className="region-guides" aria-hidden="true">
          {GUIDE_REGIONS[view].map((id) =>
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
        <text x="34" y="44"><title>{leftSide.title}</title>{leftSide.text}</text>
        <text x={W - 34} y="44" textAnchor="end"><title>{rightSide.title}</title>{rightSide.text}</text>
      </g>
    </svg>
  );
}
