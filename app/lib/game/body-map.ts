import type { OrganId } from "../anatomy-data";

/**
 * Mapa anatómico del reto "Arma el cuerpo humano" en vista anterior.
 *
 * Coordenadas en el viewBox de la figura (400 × 720). Convención clínica: la
 * derecha del paciente queda a la IZQUIERDA del observador. Las regiones
 * siguen la nomenclatura docente (9 regiones abdominales, hemitórax,
 * mediastino…) y un punto se asigna a la región más pequeña que lo contiene,
 * de modo que las estructuras finas (órbitas) ganan a las amplias (cara).
 *
 * Módulo puro: sin React ni DOM, compartido por el juego y sus pruebas.
 */

export const BODY_VIEWBOX = { width: 400, height: 720 } as const;

export type Point = { x: number; y: number };

type Ellipse = { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };
type Rect = { kind: "rect"; x: number; y: number; width: number; height: number };
/** Segmento con radio: brazos y muslos. */
type Capsule = { kind: "capsule"; x1: number; y1: number; x2: number; y2: number; r: number };
export type Shape = Ellipse | Rect | Capsule;

export const REGION_IDS = [
  "cranial",
  "orbits",
  "face",
  "neck",
  "rightHemithorax",
  "mediastinum",
  "leftHemithorax",
  "rightHypochondrium",
  "epigastric",
  "leftHypochondrium",
  "rightLumbar",
  "umbilical",
  "leftLumbar",
  "rightIliac",
  "hypogastric",
  "leftIliac",
  "limbs",
] as const;

export type RegionId = (typeof REGION_IDS)[number];

const rect = (x: number, y: number, width: number, height: number): Rect => ({ kind: "rect", x, y, width, height });
const ellipse = (cx: number, cy: number, rx: number, ry: number): Ellipse => ({ kind: "ellipse", cx, cy, rx, ry });
const capsule = (x1: number, y1: number, x2: number, y2: number, r: number): Capsule => ({ kind: "capsule", x1, y1, x2, y2, r });
/** Refleja una forma respecto a la línea media (lado derecho ↔ izquierdo del paciente). */
const mirrorX = (x: number) => BODY_VIEWBOX.width - x;

// Columnas (líneas medioclaviculares) y filas (planos subcostal y transtubercular).
const COLS = [136, 180, 220, 264] as const;
const ROWS = [356, 426, 496, 566] as const;
const cell = (col: number, row: number) => rect(COLS[col], ROWS[row], COLS[col + 1] - COLS[col], ROWS[row + 1] - ROWS[row]);

const ARM = [capsule(146, 200, 114, 390, 20), capsule(114, 390, 98, 552, 16), ellipse(94, 584, 17, 26)];
const THIGH = capsule(170, 600, 166, 760, 26);

export const REGION_SHAPES: Record<RegionId, readonly Shape[]> = {
  cranial: [ellipse(200, 62, 38, 32)],
  orbits: [ellipse(182, 98, 12, 8), ellipse(218, 98, 12, 8)],
  face: [ellipse(200, 80, 44, 54)],
  neck: [rect(182, 130, 36, 52)],
  rightHemithorax: [rect(136, 196, 50, 160)],
  mediastinum: [rect(186, 208, 34, 148)],
  leftHemithorax: [rect(220, 196, 44, 160)],
  rightHypochondrium: [cell(0, 0)],
  epigastric: [cell(1, 0)],
  leftHypochondrium: [cell(2, 0)],
  rightLumbar: [cell(0, 1)],
  umbilical: [cell(1, 1)],
  leftLumbar: [cell(2, 1)],
  rightIliac: [cell(0, 2)],
  hypogastric: [cell(1, 2)],
  leftIliac: [cell(2, 2)],
  limbs: [
    ...ARM,
    ...ARM.map((shape): Shape =>
      shape.kind === "capsule"
        ? { ...shape, x1: mirrorX(shape.x1), x2: mirrorX(shape.x2) }
        : shape.kind === "ellipse"
          ? { ...shape, cx: mirrorX(shape.cx) }
          : shape,
    ),
    THIGH,
    { ...THIGH, x1: mirrorX(THIGH.x1), x2: mirrorX(THIGH.x2) },
  ],
};

function shapeArea(shape: Shape): number {
  if (shape.kind === "ellipse") return Math.PI * shape.rx * shape.ry;
  if (shape.kind === "rect") return shape.width * shape.height;
  return Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) * shape.r * 2 + Math.PI * shape.r ** 2;
}

function contains(shape: Shape, { x, y }: Point): boolean {
  if (shape.kind === "ellipse") return ((x - shape.cx) / shape.rx) ** 2 + ((y - shape.cy) / shape.ry) ** 2 <= 1;
  if (shape.kind === "rect") return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const t = Math.max(0, Math.min(1, ((x - shape.x1) * dx + (y - shape.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (shape.x1 + t * dx), y - (shape.y1 + t * dy)) <= shape.r;
}

/** Área de la región (suma de sus formas): decide la prioridad en solapamientos. */
const REGION_AREA = Object.fromEntries(
  REGION_IDS.map((id) => [id, REGION_SHAPES[id].reduce((total, shape) => total + shapeArea(shape), 0)]),
) as Record<RegionId, number>;

/** Región anatómica bajo un punto, o `null` si cae fuera de cualquier región evaluable. */
export function regionAt(point: Point): RegionId | null {
  let best: RegionId | null = null;
  for (const id of REGION_IDS) {
    if (!REGION_SHAPES[id].some((shape) => contains(shape, point))) continue;
    if (best === null || REGION_AREA[id] < REGION_AREA[best]) best = id;
  }
  return best;
}

/** Regiones cuyo centro geométrico cae en otra región más fina (la cara contiene las órbitas). */
const CENTER_OVERRIDES: Partial<Record<RegionId, Point>> = { face: { x: 200, y: 120 } };

/** Punto representativo de una región: destino de la colocación por teclado. */
export function regionCenter(id: RegionId): Point {
  const override = CENTER_OVERRIDES[id];
  if (override) return override;
  const shape = REGION_SHAPES[id][0];
  if (shape.kind === "ellipse") return { x: shape.cx, y: shape.cy };
  if (shape.kind === "rect") return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
  return { x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2 };
}

export type OrganTarget = {
  /** Ubicación principal: puntuación completa. */
  primary: readonly RegionId[];
  /** Regiones a las que el órgano también se extiende: respuesta aceptable. */
  partial: readonly RegionId[];
  /** Dónde se dibuja el órgano al colocarlo bien (uno o varios, p. ej. ambos ojos). */
  anchors: readonly Point[];
  /** Tamaño dibujado en unidades del viewBox. */
  size: number;
  /** Orden de apilado: lo profundo (pulmones, riñones) debajo. */
  layer: number;
};

export const ORGAN_TARGETS: Record<OrganId, OrganTarget> = {
  brain: { primary: ["cranial"], partial: [], anchors: [{ x: 200, y: 62 }], size: 72, layer: 2 },
  eyeball: { primary: ["orbits"], partial: [], anchors: [{ x: 182, y: 98 }, { x: 218, y: 98 }], size: 24, layer: 3 },
  // El corazón ocupa el mediastino medio con la punta hacia la izquierda.
  heart: { primary: ["mediastinum"], partial: ["leftHemithorax"], anchors: [{ x: 208, y: 292 }], size: 58, layer: 3 },
  lungs: { primary: ["rightHemithorax", "leftHemithorax"], partial: ["mediastinum"], anchors: [{ x: 200, y: 272 }], size: 150, layer: 1 },
  // El hígado ocupa el hipocondrio derecho y se extiende al epigastrio.
  liver: { primary: ["rightHypochondrium"], partial: ["epigastric"], anchors: [{ x: 178, y: 392 }], size: 88, layer: 4 },
  // El páncreas cruza el epigastrio; su cola llega al hipocondrio izquierdo.
  pancreas: { primary: ["epigastric"], partial: ["leftHypochondrium"], anchors: [{ x: 210, y: 420 }], size: 56, layer: 5 },
  // Retroperitoneales, a la altura de los flancos (T12–L3).
  kidneys: { primary: ["rightLumbar", "leftLumbar"], partial: [], anchors: [{ x: 200, y: 456 }], size: 104, layer: 2 },
  // Intestino delgado en la región umbilical; el colon recorre flancos y fosas ilíacas.
  intestine: {
    primary: ["umbilical"],
    partial: ["hypogastric", "rightIliac", "leftIliac", "rightLumbar", "leftLumbar"],
    anchors: [{ x: 200, y: 504 }],
    size: 116,
    layer: 3,
  },
  // La piel cubre todo el cuerpo: se evalúa sobre la superficie de las extremidades.
  skin: { primary: ["limbs"], partial: [], anchors: [{ x: 104, y: 470 }], size: 46, layer: 6 },
};

export type PlacementResult = "correct" | "partial" | "wrong";

export type Evaluation = { result: PlacementResult; region: RegionId | null };

export function evaluatePlacement(organId: OrganId, point: Point): Evaluation {
  const region = regionAt(point);
  const target = ORGAN_TARGETS[organId];
  if (region && target.primary.includes(region)) return { result: "correct", region };
  if (region && target.partial.includes(region)) return { result: "partial", region };
  return { result: "wrong", region };
}
