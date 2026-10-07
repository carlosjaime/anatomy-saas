import type { OrganId } from "../anatomy-data";

/**
 * Movimiento fisiológico idealizado de cada órgano. Son funciones puras del
 * tiempo, así que el visor solo muestrea y aplica la transformación: no hay
 * estado que sincronizar ni dependencias de Three.js aquí.
 */

export type MotionProfile = "heartbeat" | "breathing" | "saccade" | "peristalsis" | "perfusion";

export type MotionSample = { sx: number; sy: number; sz: number; rx: number; ry: number; rz: number };

export const IDENTITY_SAMPLE: Readonly<MotionSample> = { sx: 1, sy: 1, sz: 1, rx: 0, ry: 0, rz: 0 };

export const MOTION_BY_ORGAN: Record<OrganId, { profile: MotionProfile; label: string; description: string }> = {
  heart: { profile: "heartbeat", label: "Latido", description: "Ciclo cardíaco a 72 lpm: sístole ventricular y llenado diastólico." },
  brain: { profile: "perfusion", label: "Pulsatilidad", description: "Pulsación cerebral transmitida por el flujo arterial." },
  lungs: { profile: "breathing", label: "Respiración", description: "14 respiraciones por minuto: inspiración activa y espiración pasiva." },
  liver: { profile: "perfusion", label: "Perfusión", description: "Pulsación sutil por el flujo de la arteria hepática." },
  kidneys: { profile: "perfusion", label: "Perfusión", description: "Pulsación por el alto flujo renal (≈20 % del gasto cardíaco)." },
  eyeball: { profile: "saccade", label: "Sacadas", description: "Movimientos sacádicos: saltos rápidos entre puntos de fijación." },
  intestine: { profile: "peristalsis", label: "Peristalsis", description: "Ondas de contracción que impulsan el contenido intestinal." },
  pancreas: { profile: "perfusion", label: "Perfusión", description: "Pulsación sutil por la irrigación esplénica y pancreaticoduodenal." },
  skin: { profile: "perfusion", label: "Perfusión", description: "Variación del flujo en el plexo vascular dérmico." },
};

const HEART_RATE_BPM = 72;
const BREATHS_PER_MIN = 14;
const SACCADE_INTERVAL_S = 1.35;
const TAU = Math.PI * 2;

/** Campana gaussiana normalizada: 1 en `center`. */
function bump(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-d * d);
}

function phaseOf(t: number, period: number): number {
  return ((t % period) + period) % period / period;
}

/** Pseudoaleatorio determinista en [-1, 1] para un índice entero. */
function hash(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
}

export function sampleMotion(profile: MotionProfile, t: number, out: MotionSample = { ...IDENTITY_SAMPLE }): MotionSample {
  Object.assign(out, IDENTITY_SAMPLE);
  switch (profile) {
    case "heartbeat": {
      const phase = phaseOf(t, 60 / HEART_RATE_BPM);
      // Sístole: contracción rápida; diástole: llenado más lento con leve expansión.
      const systole = bump(phase, 0.12, 0.07);
      const filling = bump(phase, 0.55, 0.14);
      const atrial = bump(phase, 0.9, 0.05);
      out.sx = out.sz = 1 - 0.05 * systole + 0.014 * filling - 0.012 * atrial;
      out.sy = 1 - 0.035 * systole + 0.01 * filling;
      out.rz = 0.022 * systole;
      out.ry = -0.012 * systole;
      break;
    }
    case "breathing": {
      const phase = phaseOf(t, 60 / BREATHS_PER_MIN);
      // Inspiración ~40 % del ciclo, espiración pasiva más larga.
      const v = phase < 0.4 ? 0.5 - 0.5 * Math.cos((phase / 0.4) * Math.PI) : 0.5 + 0.5 * Math.cos(((phase - 0.4) / 0.6) * Math.PI);
      out.sx = out.sz = 1 + 0.04 * v;
      out.sy = 1 + 0.055 * v;
      out.rx = -0.01 * v;
      break;
    }
    case "saccade": {
      const index = Math.floor(t / SACCADE_INTERVAL_S);
      const local = (t / SACCADE_INTERVAL_S) - index;
      const travel = easeOutCubic(local / 0.1);
      const fromY = hash(index - 1, 1) * 0.32;
      const fromX = hash(index - 1, 2) * 0.14;
      const toY = hash(index, 1) * 0.32;
      const toX = hash(index, 2) * 0.14;
      // Microtremor fisiológico de fijación.
      const tremor = Math.sin(t * 47) * 0.002;
      out.ry = fromY + (toY - fromY) * travel + tremor;
      out.rx = fromX + (toX - fromX) * travel;
      break;
    }
    case "peristalsis": {
      const w = (TAU * t) / 3.2;
      out.sx = 1 + 0.02 * Math.sin(w);
      out.sz = 1 + 0.02 * Math.sin(w + Math.PI / 2);
      out.sy = 1 + 0.012 * Math.sin(w + Math.PI);
      out.rz = 0.018 * Math.sin(w * 0.5);
      break;
    }
    case "perfusion": {
      const pulse = bump(phaseOf(t, 60 / HEART_RATE_BPM), 0.18, 0.1);
      out.sx = out.sy = out.sz = 1 + 0.009 * pulse;
      break;
    }
  }
  return out;
}
