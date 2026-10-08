import type { PlacementResult } from "./body-map";

/** Reglas de puntuación del reto: módulo puro para poder probarlas aisladas. */

export const GAME_MODES = ["learn", "exam", "timed"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const DIFFICULTIES = ["guided", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const TIMED_DURATION_MS = 90_000;
export const TIMED_MISS_PENALTY_MS = 5_000;
export const HINT_COST = 20;
const BASE = { correct: 100, partial: 50, wrong: 0 } as const;
const ATTEMPT_FACTOR = [1, 0.6, 0.3] as const;
const MAX_COMBO_MULTIPLIER = 2;

export function isGameMode(value: unknown): value is GameMode {
  return (GAME_MODES as readonly unknown[]).includes(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value);
}

export function difficultyMultiplier(difficulty: Difficulty): number {
  return difficulty === "expert" ? 1.5 : 1;
}

export function comboMultiplier(combo: number): number {
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.max(0, combo) * 0.25);
}

/**
 * Puntos de una colocación aceptada. `attempt` es 0 en el primer intento;
 * `combo` cuenta los aciertos previos consecutivos al primer intento.
 */
export function placementPoints(result: PlacementResult, attempt: number, combo: number, difficulty: Difficulty): number {
  if (result === "wrong") return 0;
  const factor = ATTEMPT_FACTOR[Math.min(attempt, ATTEMPT_FACTOR.length - 1)];
  const comboFactor = attempt === 0 && result === "correct" ? comboMultiplier(combo) : 1;
  return Math.round(BASE[result] * factor * comboFactor * difficultyMultiplier(difficulty));
}

/** Bono de Contrarreloj por segundos sobrantes. */
export function timeBonus(remainingMs: number, difficulty: Difficulty): number {
  return Math.round(Math.max(0, remainingMs) / 1000) * 5 * difficultyMultiplier(difficulty);
}

/** Precisión 0–1: cuenta el resultado definitivo de cada órgano al primer intento. */
export function accuracy(firstResults: readonly PlacementResult[], total: number): number {
  if (total <= 0) return 0;
  const earned = firstResults.reduce((sum, result) => sum + (result === "correct" ? 1 : result === "partial" ? 0.5 : 0), 0);
  return earned / total;
}

export function starsFor(value: number): 0 | 1 | 2 | 3 {
  if (value >= 0.9) return 3;
  if (value >= 0.7) return 2;
  if (value >= 0.4) return 1;
  return 0;
}
