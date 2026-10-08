"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  Lightbulb,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  Settings2,
  Star,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { BodyFigure, type RegionTone } from "./BodyFigure";
import { OrganArt } from "./OrganArt";
import { useGameAudio, type GameSound } from "./useGameAudio";
import { BrandMark } from "../BrandMark";
import { Dialog } from "../Dialog";
import { Confetti } from "../ui/Confetti";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { useI18n } from "../../i18n/client";
import type { OrganId } from "../../lib/anatomy-data";
import { trackStudy } from "../../lib/client-api";
import {
  BODY_VIEWBOX,
  ORGAN_TARGETS,
  REGION_IDS_BY_VIEW,
  evaluatePlacement,
  regionAt,
  regionCenter,
  type ExtraOrganId,
  type GameOrganId,
  type OrganTarget,
  type PlacementResult,
  type Point,
  type RegionId,
  type View,
} from "../../lib/game/body-map";
import {
  DIFFICULTIES,
  GAME_MODES,
  HINT_COST,
  TIMED_DURATION_MS,
  TIMED_MISS_PENALTY_MS,
  VIEW_MODES,
  accuracy as computeAccuracy,
  bestKey,
  isDifficulty,
  isGameMode,
  isViewMode,
  placementPoints,
  starsFor,
  timeBonus,
  type Difficulty,
  type GameMode,
  type ViewMode,
} from "../../lib/game/scoring";

export type GameOrgan = {
  id: GameOrganId;
  name: string;
  system: string;
  location: string;
  accent: string;
  /** Vistas en las que se puede colocar. */
  views: View[];
  /** Órgano del atlas: su resultado se registra en el panel de estudio. */
  tracked: boolean;
  /** `image`: ilustración del atlas; `vector`: arte vectorial propio del reto. */
  art: "image" | "vector";
};

type Status = "tray" | "placed" | "correct" | "partial" | "wrong";

type OrganState = {
  status: Status;
  /** Vista en la que se colocó. */
  view?: View;
  /** Punto donde se soltó (examen y revisión de errores). */
  point?: Point;
  region?: RegionId | null;
  /** Intentos fallidos (aprendizaje y contrarreloj). */
  misses: number;
  /** Resultado del primer intento: base de la precisión. */
  first?: PlacementResult;
  points: number;
  /** Desplazamiento en px desde el punto soltado hasta el ancla: animación de encaje. */
  snap?: { dx: number; dy: number };
};

type Phase = "setup" | "playing" | "finished";
type Feedback = { tone: "info" | "correct" | "partial" | "wrong"; text: string; organId?: GameOrganId; points?: number; penalty?: boolean };
type Summary = { score: number; accuracy: number; stars: 0 | 1 | 2 | 3; timeMs: number; bonus: number; newBest: boolean; timeUp: boolean };

const { width: VB_W, height: VB_H } = BODY_VIEWBOX;
const DRAG_THRESHOLD = 6;
const FLIP_MS = 460;
const PREFS_KEY = "atlas:game:prefs";
const MODE_ICONS = { learn: GraduationCap, exam: CircleHelp, timed: Timer } as const;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Almacenamiento no disponible: los récords duran solo la sesión.
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

const freshStates = (organs: readonly GameOrgan[]) =>
  Object.fromEntries(organs.map((organ) => [organ.id, { status: "tray", misses: 0, points: 0 } satisfies OrganState])) as Record<
    GameOrganId,
    OrganState
  >;

const targetIn = (view: View, organId: GameOrganId): OrganTarget | undefined => ORGAN_TARGETS[view][organId];

/** Posición en % del escenario para un punto del viewBox. */
const toPercent = (point: Point): CSSProperties => ({ left: `${(point.x / VB_W) * 100}%`, top: `${(point.y / VB_H) * 100}%` });

/** Ilustración de un órgano: acuarela del atlas o arte vectorial del reto. */
function OrganVisual({ organ, size, alt = "", suffix = "" }: { organ: GameOrgan; size: number; alt?: string; suffix?: string }) {
  if (organ.art === "vector") {
    return (
      <span className="game-organ-art" role={alt ? "img" : undefined} aria-label={alt || undefined}>
        <OrganArt id={organ.id as ExtraOrganId} suffix={suffix} />
      </span>
    );
  }
  // Miniatura ligera para tamaños pequeños; la ilustración grande solo si se dibuja amplia.
  const large = size > 80;
  return (
    <img
      className="game-organ-img"
      src={`/anatomy/${organ.id}/thumb.webp`}
      srcSet={large ? `/anatomy/${organ.id}/thumb.webp 180w, /anatomy/${organ.id}/organ.webp 720w` : undefined}
      sizes={large ? `${Math.round(size * 1.1)}px` : undefined}
      alt={alt}
      width={180}
      height={180}
      draggable={false}
      decoding="async"
    />
  );
}

/** Reloj aislado: se re-renderiza 4 veces por segundo sin redibujar todo el juego. */
function GameClock({ mode, getElapsed, onExpire, label }: { mode: GameMode; getElapsed: () => number; onExpire: () => void; label: string }) {
  const [, setTick] = useState(0);
  const expired = useRef(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
      if (mode === "timed" && !expired.current && getElapsed() >= TIMED_DURATION_MS) {
        expired.current = true;
        onExpire();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [mode, getElapsed, onExpire]);
  const elapsed = getElapsed();
  const value = mode === "timed" ? TIMED_DURATION_MS - elapsed : elapsed;
  const urgent = mode === "timed" && value <= 10_000;
  return (
    <span className={`hud-stat ${urgent ? "urgent" : ""}`} data-testid="game-clock">
      <Timer size={15} /> <small>{label}</small> <b>{formatClock(value)}</b>
    </span>
  );
}

export function BodyGame({ organs, signedIn }: { organs: readonly GameOrgan[]; signedIn: boolean }) {
  const { m, t } = useI18n();
  const g = m.game;
  const { muted, toggleMuted, play } = useGameAudio();
  const organById = useMemo(() => Object.fromEntries(organs.map((organ) => [organ.id, organ])) as Record<GameOrganId, GameOrgan>, [organs]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<GameMode>("learn");
  const [difficulty, setDifficulty] = useState<Difficulty>("guided");
  const [viewMode, setViewMode] = useState<ViewMode>("anterior");
  const [view, setView] = useState<View>("anterior");
  const [flipping, setFlipping] = useState(false);
  const [states, setStates] = useState(() => freshStates(organs));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [selected, setSelected] = useState<GameOrganId | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hint, setHint] = useState<GameOrganId | null>(null);
  const [flash, setFlash] = useState<{ region: RegionId | null; point: Point; key: number } | null>(null);
  const [queue, setQueue] = useState<GameOrganId[]>([]);
  const [paused, setPaused] = useState(false);
  const [guides, setGuides] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [bests, setBests] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState<GameOrganId | null>(null);
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ organId: GameOrganId; pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const clock = useRef({ accumulated: 0, since: null as number | null });
  const timers = useRef(new Set<number>());
  const flashSeq = useRef(0);

  /** Órganos de la partida según la vista elegida. */
  const active = useMemo(
    () => (viewMode === "both" ? organs : organs.filter((organ) => organ.views.includes(viewMode))),
    [organs, viewMode],
  );
  const countFor = (option: ViewMode) => (option === "both" ? organs.length : organs.filter((organ) => organ.views.includes(option)).length);

  const guided = difficulty === "guided";
  const showGuides = guided && guides;
  const total = active.length;
  const settled = (status: Status) => status === "correct" || status === "partial";
  const placedCount = active.filter((organ) => states[organ.id].status !== "tray").length;
  const doneCount = active.filter((organ) => settled(states[organ.id].status)).length;
  const target = mode === "timed" ? queue.find((id) => !settled(states[id].status)) ?? null : null;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  // Preferencias y récords guardados (solo en el cliente).
  useEffect(() => {
    const pending = timers.current;
    try {
      const prefs = JSON.parse(readStorage(PREFS_KEY) ?? "{}") as { mode?: unknown; difficulty?: unknown; viewMode?: unknown };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage tras hidratar
      if (isGameMode(prefs.mode)) setMode(prefs.mode);
      if (isDifficulty(prefs.difficulty)) setDifficulty(prefs.difficulty);
      if (isViewMode(prefs.viewMode)) setViewMode(prefs.viewMode);
    } catch {
      // Preferencias corruptas: se usan los valores por defecto.
    }
    const loaded: Record<string, number> = {};
    for (const gameMode of GAME_MODES) {
      for (const level of DIFFICULTIES) {
        for (const option of VIEW_MODES) {
          const key = bestKey(gameMode, level, option);
          const value = Number(readStorage(key));
          if (Number.isFinite(value) && value > 0) loaded[key] = value;
        }
      }
    }
    setBests(loaded);
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const getElapsed = useCallback(() => {
    const { accumulated, since } = clock.current;
    return accumulated + (since === null ? 0 : performance.now() - since);
  }, []);

  const setRunning = useCallback((running: boolean) => {
    const current = clock.current;
    if (running && current.since === null) current.since = performance.now();
    if (!running && current.since !== null) {
      current.accumulated += performance.now() - current.since;
      current.since = null;
    }
  }, []);

  const sound = useCallback((name: GameSound) => play(name), [play]);

  // ── Giro del cuerpo (vista anterior ↔ posterior) ──────────────────────────
  const flipTo = useCallback(
    (next: View) => {
      if (next === view || flipping) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setView(next);
        return;
      }
      setFlipping(true);
      setHoverRegion(null);
      // El cambio de cara ocurre a mitad del giro, cuando la figura está de canto.
      later(() => setView(next), FLIP_MS / 2);
      later(() => setFlipping(false), FLIP_MS);
      sound("pick");
    },
    [flipping, later, sound, view],
  );

  // Contrarreloj en vista completa: la figura gira sola hacia la cara del órgano pedido.
  useEffect(() => {
    if (phase !== "playing" || !target || targetIn(view, target)) return;
    const next = organById[target].views[0];
    later(() => flipTo(next), 0);
  }, [phase, target, view, organById, flipTo, later]);

  // ── Ciclo de vida de la partida ───────────────────────────────────────────
  const start = () => {
    writeStorage(PREFS_KEY, JSON.stringify({ mode, difficulty, viewMode }));
    setStates(freshStates(organs));
    setScore(0);
    setCombo(0);
    setSelected(null);
    setHint(null);
    setFlash(null);
    setRevealed(false);
    setSummary(null);
    setResultsOpen(false);
    setPaused(false);
    setView(viewMode === "posterior" ? "posterior" : "anterior");
    setQueue(shuffle(active.map((organ) => organ.id)));
    setFeedback({ tone: "info", text: mode === "exam" ? g.examHelp : g.trayHelp });
    clock.current = { accumulated: 0, since: performance.now() };
    setPhase("playing");
    sound("pick");
  };

  const finish = useCallback(
    (finalStates: Record<GameOrganId, OrganState>, finalScore: number, timeUp = false) => {
      setRunning(false);
      const elapsed = Math.min(getElapsed(), mode === "timed" ? TIMED_DURATION_MS : Number.POSITIVE_INFINITY);
      const bonus = mode === "timed" && !timeUp ? timeBonus(TIMED_DURATION_MS - elapsed, difficulty) : 0;
      const firsts = active.map((organ) => finalStates[organ.id].first ?? "wrong");
      const acc = computeAccuracy(firsts, active.length);
      const totalScore = finalScore + bonus;
      const key = bestKey(mode, difficulty, viewMode);
      const newBest = totalScore > (bests[key] ?? 0);
      if (newBest) {
        writeStorage(key, String(totalScore));
        setBests((current) => ({ ...current, [key]: totalScore }));
      }
      setSummary({ score: totalScore, accuracy: acc, stars: starsFor(acc), timeMs: elapsed, bonus, newBest, timeUp });
      setPhase("finished");
      setResultsOpen(true);
      setDragging(null);
      setSelected(null);
      sound("finish");
      if (signedIn) {
        for (const organ of active) {
          const first = finalStates[organ.id].first;
          // Solo los órganos del atlas tienen ficha de progreso en el panel.
          if (first && organ.tracked) trackStudy({ organId: organ.id as OrganId, kind: "placement", correct: first !== "wrong" });
        }
      }
    },
    [active, bests, difficulty, getElapsed, mode, setRunning, signedIn, sound, viewMode],
  );

  const statesRef = useRef(states);
  const scoreRef = useRef(score);
  useEffect(() => {
    statesRef.current = states;
    scoreRef.current = score;
  }, [states, score]);

  const onExpire = useCallback(() => finish(statesRef.current, scoreRef.current, true), [finish]);

  const togglePause = useCallback(() => {
    setPaused((value) => {
      setRunning(value);
      return !value;
    });
  }, [setRunning]);

  // Pausa automática al cambiar de pestaña: el contrarreloj no corre a escondidas.
  useEffect(() => {
    if (phase !== "playing") return;
    const onVisibility = () => {
      if (document.hidden && !paused) togglePause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, paused, togglePause]);

  // ── Colocación ────────────────────────────────────────────────────────────
  const regionName = (region: RegionId | null | undefined) => (region ? g.regions[region] : g.outside);
  /** Ubicación principal en la vista de juego (o la primera vista del órgano). */
  const answerView = (organ: GameOrgan): View => (viewMode !== "both" ? viewMode : organ.views[0]);
  const primaryName = (organ: GameOrgan) => g.regions[targetIn(answerView(organ), organ.id)?.primary[0] ?? "limbs"];

  const canDrag = (organId: GameOrganId) => {
    if (phase !== "playing" || paused || revealed || flipping) return false;
    if (!active.some((organ) => organ.id === organId)) return false;
    if (settled(states[organId].status)) return false;
    if (mode === "timed") return organId === target;
    return true;
  };

  const placeAt = (organId: GameOrganId, point: Point, dropPx?: { x: number; y: number; scale: number }) => {
    if (!canDrag(organId)) return;
    const current = states[organId];
    const evaluation = evaluatePlacement(view, organId, point);
    const name = organById[organId].name;
    setSelected(null);
    setHint((value) => (value === organId ? null : value));

    if (mode === "exam") {
      setStates((all) => ({ ...all, [organId]: { ...current, status: "placed", view, point, region: evaluation.region } }));
      setFeedback({ tone: "info", text: t(g.feedbackPlaced, { organ: name, region: regionName(evaluation.region) }), organId });
      sound("pick");
      return;
    }

    if (evaluation.result === "wrong") {
      const nextMisses = current.misses + 1;
      setStates((all) => ({ ...all, [organId]: { ...current, misses: nextMisses, first: current.first ?? "wrong", region: evaluation.region } }));
      setCombo(0);
      flashSeq.current += 1;
      setFlash({ region: evaluation.region, point, key: flashSeq.current });
      later(() => setFlash(null), 900);
      setFeedback({ tone: "wrong", text: t(g.feedbackWrong, { organ: name, region: regionName(evaluation.region) }), organId, penalty: mode === "timed" });
      if (mode === "timed") clock.current.accumulated += TIMED_MISS_PENALTY_MS;
      // Tras dos fallos en modo guiado, la región correcta se ilumina sola.
      if (guided && mode === "learn" && nextMisses >= 2) setHint(organId);
      sound("wrong");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(60);
      return;
    }

    const points = placementPoints(evaluation.result, current.misses, combo, difficulty);
    const anchor = targetIn(view, organId)!.anchors[0];
    const snap = dropPx ? { dx: (point.x - anchor.x) * dropPx.scale, dy: (point.y - anchor.y) * dropPx.scale } : undefined;
    const nextState: OrganState = {
      ...current,
      status: evaluation.result === "correct" ? "correct" : "partial",
      view,
      point,
      region: evaluation.region,
      first: current.first ?? evaluation.result,
      points,
      snap,
    };
    const nextStates = { ...states, [organId]: nextState };
    const nextScore = score + points;
    const firstTry = current.misses === 0 && evaluation.result === "correct";
    const nextCombo = firstTry ? combo + 1 : 0;
    setStates(nextStates);
    setScore(nextScore);
    setCombo(nextCombo);
    setFeedback({
      tone: evaluation.result,
      text:
        evaluation.result === "correct"
          ? t(g.feedbackCorrect, { organ: name, region: regionName(evaluation.region) })
          : t(g.feedbackPartial, { organ: name, region: regionName(evaluation.region), primary: g.regions[targetIn(view, organId)!.primary[0]] }),
      organId,
      points,
    });
    sound(nextCombo >= 3 && firstTry ? "combo" : evaluation.result === "correct" ? "correct" : "partial");
    if (active.every((organ) => settled(nextStates[organ.id].status))) later(() => finish(nextStates, nextScore), 650);
  };

  const evaluateExam = () => {
    const stagePx = stageRef.current?.getBoundingClientRect();
    const scale = stagePx ? stagePx.width / VB_W : 1;
    let earned = 0;
    const next = { ...states };
    for (const organ of active) {
      const current = states[organ.id];
      if (current.status !== "placed" || !current.point || !current.view) continue;
      const { result, region } = evaluatePlacement(current.view, organ.id, current.point);
      const points = placementPoints(result, 0, 0, difficulty);
      earned += points;
      const anchor = targetIn(current.view, organ.id)?.anchors[0];
      next[organ.id] = {
        ...current,
        status: result,
        region,
        first: result,
        points,
        snap: result === "wrong" || !anchor ? undefined : { dx: (current.point.x - anchor.x) * scale, dy: (current.point.y - anchor.y) * scale },
      };
    }
    setStates(next);
    setScore(earned);
    setRevealed(true);
    sound("correct");
    later(() => finish(next, earned), 1400);
  };

  const requestHint = () => {
    const organId = selected ?? target ?? active.find((organ) => !settled(states[organ.id].status))?.id;
    if (!organId || !guided || mode === "exam") return;
    const organ = organById[organId];
    setHint(organId);
    setScore((value) => Math.max(0, value - HINT_COST));
    const text = targetIn(view, organId) ? t(g.hintText, { organ: organ.name, text: organ.location }) : t(g.flipHint, { organ: organ.name });
    setFeedback({ tone: "info", text, organId });
    sound("pick");
  };

  // ── Arrastre (Pointer Events: ratón, táctil y lápiz) ──────────────────────
  const toViewBox = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    return {
      inside,
      point: { x: ((clientX - rect.left) / rect.width) * VB_W, y: ((clientY - rect.top) / rect.height) * VB_H },
      scale: rect.width / VB_W,
    };
  };

  const moveGhost = (clientX: number, clientY: number) => {
    const ghost = ghostRef.current;
    if (ghost) ghost.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
  };

  const onPointerDown = (organId: GameOrganId) => (event: ReactPointerEvent<HTMLElement>) => {
    if (!canDrag(organId) || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { organId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved) {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD) return;
      current.moved = true;
      setDragging(current.organId);
      setSelected(null);
      sound("pick");
    }
    moveGhost(event.clientX, event.clientY);
    if (guided) {
      const position = toViewBox(event.clientX, event.clientY);
      const region = position?.inside ? regionAt(view, position.point) : null;
      setHoverRegion((value) => (value === region ? value : region));
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setHoverRegion(null);
    if (!current.moved) {
      if (!cancelled) {
        // Un toque sin arrastre selecciona el órgano (colocación por toque o teclado).
        setSelected((value) => (value === current.organId ? null : current.organId));
        sound("pick");
      }
      return;
    }
    setDragging(null);
    if (cancelled) return;
    const position = toViewBox(event.clientX, event.clientY);
    if (position?.inside) {
      placeAt(current.organId, position.point, { x: event.clientX, y: event.clientY, scale: position.scale });
    }
  };

  const onStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selected) return;
    const position = toViewBox(event.clientX, event.clientY);
    if (position?.inside) placeAt(selected, position.point, { x: event.clientX, y: event.clientY, scale: position.scale });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  // ── Derivados de presentación ─────────────────────────────────────────────
  const highlights: Partial<Record<RegionId, RegionTone>> = {};
  const hintTarget = hint ? targetIn(view, hint) : undefined;
  if (hintTarget) for (const region of hintTarget.primary) highlights[region] = "hint";
  if (dragging && hoverRegion) highlights[hoverRegion] = "hover";
  if (flash?.region) highlights[flash.region] = "wrong";

  const layerOf = (organ: GameOrgan) => targetIn(view, organ.id)?.layer ?? 0;
  const ordered = [...active].sort((a, b) => layerOf(a) - layerOf(b));
  const bestValue = bests[bestKey(mode, difficulty, viewMode)];
  const sideLabels = { right: g.rightShort, left: g.leftShort, rightTitle: g.patientRight, leftTitle: g.patientLeft };
  const feedbackOrgan = feedback?.organId ? organById[feedback.organId] : null;
  const hudPrompt = target ? organById[target] : null;
  const otherView: View = view === "anterior" ? "posterior" : "anterior";
  const canFlip = viewMode === "both" && phase !== "setup";

  return (
    <div className={`game ${phase} ${dragging ? "is-dragging" : ""}`}>
      <header className="game-topbar">
        <Link href="/atlas" className="game-back" aria-label={m.nav.atlas}>
          <ArrowLeft size={17} />
          <BrandMark size={30} />
        </Link>
        <div className="game-title">
          <em>{g.kicker}</em>
          <h1>{g.title}</h1>
        </div>
        <div className="game-topbar-actions">
          <button type="button" className="icon-btn" onClick={toggleMuted} aria-label={muted ? g.unmute : g.mute} aria-pressed={muted}>
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <LanguageSwitcher compact />
        </div>
      </header>

      <div className="game-layout">
        <section className="game-stage-col" aria-label={g.stage}>
          <div className="game-hud" aria-live="off">
            <span className="hud-stat" data-testid="game-score"><Trophy size={15} /> <small>{g.score}</small> <b>{score}</b></span>
            {phase === "playing" ? (
              <GameClock mode={mode} getElapsed={getElapsed} onExpire={onExpire} label={mode === "timed" ? g.remaining : g.time} />
            ) : (
              <span className="hud-stat"><Timer size={15} /> <small>{g.time}</small> <b>{formatClock(mode === "timed" ? TIMED_DURATION_MS : 0)}</b></span>
            )}
            <span className="hud-stat"><Check size={15} /> <small>{g.progress}</small> <b>{mode === "exam" ? placedCount : doneCount}/{total}</b></span>
            {combo >= 2 && (
              <span key={combo} className="hud-combo animate__animated animate__rubberBand"><Flame size={14} /> {t(g.combo, { value: Math.min(2, 1 + combo * 0.25).toFixed(2).replace(/\.?0+$/, "") })}</span>
            )}
            {phase === "playing" && (
              <button type="button" className="icon-btn" onClick={togglePause} aria-label={paused ? g.resume : g.pause} data-testid="game-pause">
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
          </div>

          {hudPrompt && phase === "playing" && (
            <p key={hudPrompt.id} className="game-prompt animate__animated animate__fadeInDown" data-testid="game-target">
              <span>{g.target}</span>
              <span className="prompt-visual"><OrganVisual organ={hudPrompt} size={36} suffix="-prompt" /></span>
              <b>{hudPrompt.name}</b>
            </p>
          )}

          <div
            className={`game-stage ${selected ? "awaiting-tap" : ""} ${flipping ? "flipping" : ""}`}
            ref={stageRef}
            onClick={onStageClick}
            data-testid="game-stage"
            data-view={view}
          >
            <BodyFigure view={view} showGuides={showGuides} highlights={highlights} sideLabels={sideLabels} title={`${g.stage} · ${g.viewLabel[view]}`} idPrefix="game-body" />

            <span className="stage-view-badge" aria-hidden="true">{g.viewLabel[view]}</span>
            {canFlip && (
              <button
                type="button"
                className="stage-flip"
                onClick={(event) => {
                  event.stopPropagation();
                  flipTo(otherView);
                }}
                disabled={flipping}
                aria-label={t(g.flipTo, { view: g.viewLabel[otherView] })}
                data-testid="game-flip"
              >
                <Repeat2 size={16} /> <span>{g.flip}</span>
              </button>
            )}

            {/* Líneas de revisión: del punto elegido a la ubicación correcta. */}
            {revealed && (
              <svg className="game-review-lines" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
                {active.map((organ) => {
                  const state = states[organ.id];
                  const anchor = state.view === view ? targetIn(view, organ.id)?.anchors[0] : undefined;
                  if (state.status !== "wrong" || !state.point || !anchor) return null;
                  return <line key={organ.id} x1={state.point.x} y1={state.point.y} x2={anchor.x} y2={anchor.y} />;
                })}
              </svg>
            )}

            <div className="game-overlay">
              {ordered.map((organ) => {
                const state = states[organ.id];
                if (state.view !== view) return null;
                const targetInfo = targetIn(view, organ.id);
                if (settled(state.status) && targetInfo) {
                  return targetInfo.anchors.map((anchor, index) => (
                    <span
                      key={`${organ.id}-${index}`}
                      className={`placed-organ ${state.status} ${organ.art}`}
                      style={{
                        ...toPercent(anchor),
                        width: `${(targetInfo.size / VB_W) * 100}%`,
                        aspectRatio: `1 / ${targetInfo.aspect ?? 1}`,
                        zIndex: targetInfo.layer,
                        "--dx": `${state.snap?.dx ?? 0}px`,
                        "--dy": `${state.snap?.dy ?? 0}px`,
                        "--accent": organ.accent,
                      } as CSSProperties}
                      data-testid={index === 0 ? `placed-${organ.id}` : undefined}
                      data-result={state.status}
                    >
                      <OrganVisual organ={organ} size={targetInfo.size} alt={index === 0 ? `${organ.name} · ${regionName(state.region)}` : ""} suffix={`-placed-${index}`} />
                    </span>
                  ));
                }
                if ((state.status === "placed" || state.status === "wrong") && state.point) {
                  return (
                    <span key={organ.id} className="placed-group">
                      {state.status === "wrong" && revealed && targetInfo && (
                        <span
                          className={`answer-ghost ${organ.art}`}
                          style={{ ...toPercent(targetInfo.anchors[0]), width: `${(targetInfo.size / VB_W) * 100}%`, aspectRatio: `1 / ${targetInfo.aspect ?? 1}` }}
                          aria-hidden="true"
                        >
                          <OrganVisual organ={organ} size={targetInfo.size} suffix="-ghost" />
                        </span>
                      )}
                      <button
                        type="button"
                        className={`pin-organ ${state.status} ${organ.art}`}
                        style={toPercent(state.point)}
                        onPointerDown={onPointerDown(organ.id)}
                        onPointerMove={onPointerMove}
                        onPointerUp={(event) => endDrag(event, false)}
                        onPointerCancel={(event) => endDrag(event, true)}
                        onClick={(event) => event.stopPropagation()}
                        disabled={!canDrag(organ.id)}
                        aria-label={`${organ.name} · ${regionName(state.region)}`}
                        data-testid={`pin-${organ.id}`}
                      >
                        <OrganVisual organ={organ} size={44} suffix="-pin" />
                        {state.status === "wrong" && <X size={14} className="pin-mark" />}
                      </button>
                    </span>
                  );
                }
                return null;
              })}

              {feedback && feedback.tone !== "info" && phase === "playing" && (
                <p key={`${feedback.text}-${flash?.key ?? 0}`} className={`stage-bubble ${feedback.tone}`} aria-hidden="true">
                  {feedback.tone === "correct" ? <Check size={14} /> : feedback.tone === "wrong" ? <X size={14} /> : <CircleHelp size={14} />}
                  <span>{feedback.text}</span>
                  {feedback.points ? <b>{t(g.points, { points: feedback.points })}</b> : null}
                  {feedback.penalty && <b>{g.penalty}</b>}
                </p>
              )}

              {flash && (
                <span key={flash.key} className="miss-ping" style={toPercent(flash.point)} aria-hidden="true">
                  <X size={16} />
                </span>
              )}
            </div>

            {phase === "setup" && (
              <div className="game-setup" onClick={(event) => event.stopPropagation()}>
                <div className="game-setup-card animate__animated animate__zoomIn">
                  <span className="modal-icon clinical"><Trophy size={24} /></span>
                  <h2>{g.title}</h2>
                  <p>{g.intro}</p>
                  <fieldset className="game-modes">
                    <legend>{g.chooseMode}</legend>
                    {GAME_MODES.map((option) => {
                      const Icon = MODE_ICONS[option];
                      return (
                        <label key={option} className={mode === option ? "selected" : ""}>
                          <input type="radio" name="game-mode" value={option} checked={mode === option} onChange={() => setMode(option)} />
                          <span className="mode-icon"><Icon size={18} /></span>
                          <span>
                            <b>{g.modes[option].name}</b>
                            <small>{g.modes[option].text}</small>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                  <fieldset className="game-difficulty game-views">
                    <legend>{g.view}</legend>
                    <div role="presentation">
                      {VIEW_MODES.map((option) => (
                        <label key={option} className={viewMode === option ? "selected" : ""}>
                          <input type="radio" name="game-view" value={option} checked={viewMode === option} onChange={() => setViewMode(option)} />
                          {g.views[option].name}
                          <small>{t(g.organCount, { count: countFor(option) })}</small>
                        </label>
                      ))}
                    </div>
                    <small>{g.views[viewMode].text}</small>
                  </fieldset>
                  <fieldset className="game-difficulty">
                    <legend>{g.difficulty}</legend>
                    <div role="presentation">
                      {DIFFICULTIES.map((option) => (
                        <label key={option} className={difficulty === option ? "selected" : ""}>
                          <input type="radio" name="game-difficulty" value={option} checked={difficulty === option} onChange={() => setDifficulty(option)} />
                          {g.difficulties[option].name}
                        </label>
                      ))}
                    </div>
                    <small>{g.difficulties[difficulty].text}</small>
                  </fieldset>
                  <p className="game-best"><Star size={14} /> {bestValue ? t(g.best, { score: bestValue }) : g.noBest}</p>
                  <button type="button" className="btn btn-primary btn-lg btn-block btn-shine" onClick={start} data-testid="game-start">
                    <Play size={18} /> {g.start}
                  </button>
                </div>
              </div>
            )}

            {paused && phase === "playing" && (
              <div className="game-paused" onClick={(event) => event.stopPropagation()}>
                <p>{g.paused}</p>
                <button type="button" className="btn btn-primary" onClick={togglePause}><Play size={16} /> {g.resume}</button>
              </div>
            )}
          </div>
        </section>

        <aside className="game-tray" aria-label={g.tray}>
          <h2>{g.tray} <small>{t(g.organCount, { count: active.length })}</small></h2>
          <ul>
            {active.map((organ, index) => {
              const state = states[organ.id];
              const done = settled(state.status);
              const enabled = canDrag(organ.id);
              const isTarget = organ.id === target;
              const elsewhere = viewMode === "both" && !organ.views.includes(view);
              return (
                <li key={organ.id} className={`${done ? "done" : ""} ${state.status === "placed" ? "placed" : ""}`} style={{ "--i": index } as CSSProperties}>
                  <button
                    type="button"
                    className={`tray-organ ${organ.art} ${selected === organ.id ? "selected" : ""} ${dragging === organ.id ? "dragging" : ""} ${isTarget ? "target" : ""} ${elsewhere ? "other-view" : ""}`}
                    style={{ "--accent": organ.accent } as CSSProperties}
                    onPointerDown={onPointerDown(organ.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={(event) => endDrag(event, false)}
                    onPointerCancel={(event) => endDrag(event, true)}
                    onKeyDown={(event) => {
                      if ((event.key === "Enter" || event.key === " ") && enabled) {
                        event.preventDefault();
                        setSelected((value) => (value === organ.id ? null : organ.id));
                      }
                    }}
                    aria-pressed={selected === organ.id}
                    aria-disabled={!enabled}
                    data-testid={`tray-${organ.id}`}
                  >
                    <span className="tray-visual"><OrganVisual organ={organ} size={52} suffix="-tray" /></span>
                    <span>
                      <b>{organ.name}</b>
                      <small>{elsewhere ? g.viewLabel[organ.views[0]] : organ.system}</small>
                    </span>
                    {done && <Check size={16} className="tray-done animate__animated animate__bounceIn" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <aside className="game-panel">
          <div className={`game-feedback ${feedback?.tone ?? "info"}`} role="status" aria-live="polite" data-testid="game-feedback">
            {feedback ? (
              <div key={`${feedback.text}-${feedback.points ?? ""}`} className="animate__animated animate__fadeIn">
                <p>{feedback.text}</p>
                {feedback.points ? <strong className="feedback-points animate__animated animate__bounceIn">{t(g.points, { points: feedback.points })}</strong> : null}
                {feedback.penalty && <strong className="feedback-penalty">{g.penalty}</strong>}
                {feedbackOrgan && mode === "learn" && feedback.tone !== "wrong" && feedback.tone !== "info" && (
                  <dl className="feedback-facts">
                    <div><dt>{g.system}</dt><dd>{feedbackOrgan.system}</dd></div>
                    <div><dt>{g.location}</dt><dd>{feedbackOrgan.location}</dd></div>
                  </dl>
                )}
              </div>
            ) : (
              <p>{g.intro}</p>
            )}
          </div>

          {phase === "playing" && (
            <div className="game-tools">
              {guided && mode !== "exam" && (
                <button type="button" className="btn btn-outline" onClick={requestHint} disabled={paused} data-testid="game-hint">
                  <Lightbulb size={16} /> {g.hint} <small>{t(g.hintCost, { cost: HINT_COST })}</small>
                </button>
              )}
              {guided && (
                <button type="button" className="btn btn-ghost" onClick={() => setGuides((value) => !value)} aria-pressed={guides}>
                  {guides ? <EyeOff size={16} /> : <Eye size={16} />} {g.guides}
                </button>
              )}
              {mode === "exam" && (
                <button
                  type="button"
                  className="btn btn-primary btn-shine"
                  onClick={evaluateExam}
                  disabled={placedCount === 0 || revealed || paused}
                  data-testid="game-evaluate"
                >
                  <Check size={16} /> {t(g.evaluate, { placed: placedCount, total })}
                </button>
              )}
            </div>
          )}

          {selected && phase === "playing" && (
            <div className="region-picker animate__animated animate__fadeIn">
              <p>{t(g.selected, { organ: organById[selected].name })}</p>
              <ul aria-label={t(g.regionList, { organ: organById[selected].name })}>
                {REGION_IDS_BY_VIEW[view].map((region) => (
                  <li key={region}>
                    <button type="button" onClick={() => placeAt(selected, regionCenter(region))} data-testid={`region-${region}`}>
                      {g.regions[region]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase === "finished" && (
            <div className="game-tools">
              <button type="button" className="btn btn-primary btn-shine" onClick={start}><RotateCcw size={16} /> {g.playAgain}</button>
              <button type="button" className="btn btn-outline" onClick={() => setResultsOpen(true)} data-testid="game-view-results">
                <Trophy size={16} /> {g.viewResults}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("setup")}><Settings2 size={16} /> {g.changeMode}</button>
            </div>
          )}

          {phase === "playing" && (
            <div className="game-session-actions">
              <button type="button" className="btn btn-ghost" onClick={start}><RotateCcw size={15} /> {g.restart}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setRunning(false); setPhase("setup"); }}>
                <Settings2 size={15} /> {g.changeMode}
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className={`drag-ghost ${dragging ? "active" : ""}`} ref={ghostRef} aria-hidden="true">
        {dragging && (
          <>
            <span className={`ghost-visual ${organById[dragging].art}`}><OrganVisual organ={organById[dragging]} size={72} suffix="-ghost-drag" /></span>
            {guided && <span className="drag-region">{hoverRegion ? g.regions[hoverRegion] : g.outside}</span>}
          </>
        )}
      </div>

      {summary && phase === "finished" && (
        <>
          {(summary.newBest || summary.stars === 3) && <Confetti />}
          <Dialog open={resultsOpen} onClose={() => setResultsOpen(false)} labelledBy="game-results-title" variant="wide" className="game-results">
            <span className="modal-icon clinical animate__animated animate__bounceIn"><Trophy size={24} /></span>
            <em>{g.modes[mode].name} · {g.views[viewMode].name} · {g.difficulties[difficulty].name}</em>
            <h2 id="game-results-title">{summary.timeUp ? g.timeUp : g.resultsTitle}</h2>
            <div className="result-stars" role="img" aria-label={t(g.stars, { count: summary.stars })}>
              {[0, 1, 2].map((index) => (
                <Star key={index} size={34} className={index < summary.stars ? "on" : ""} style={{ animationDelay: `${0.25 + index * 0.18}s` }} />
              ))}
            </div>
            {summary.newBest && <p className="result-record animate__animated animate__tada animate__delay-1s">{g.newBest}</p>}
            <dl className="result-stats">
              <div><dt>{g.score}</dt><dd data-testid="result-score">{summary.score}</dd></div>
              <div><dt>{g.accuracy}</dt><dd data-testid="result-accuracy">{Math.round(summary.accuracy * 100)}%</dd></div>
              <div><dt>{g.time}</dt><dd>{formatClock(summary.timeMs)}</dd></div>
            </dl>
            {summary.bonus > 0 && <p className="result-bonus">{t(g.timeBonus, { points: summary.bonus })}</p>}

            <h3>{g.review}</h3>
            <ul className="result-review">
              {active.map((organ, index) => {
                const state = states[organ.id];
                // Un error al primer intento que luego se corrigió se distingue de un fallo definitivo.
                const fixed = state.first === "wrong" && settled(state.status);
                const result = fixed ? "fixed" : (state.first ?? "missing");
                const label = {
                  correct: g.resultCorrect,
                  partial: g.resultPartial,
                  wrong: g.resultWrong,
                  fixed: g.resultFixed,
                  missing: g.resultMissing,
                }[result];
                return (
                  <li key={organ.id} className={result} style={{ "--i": index } as CSSProperties} data-testid={`review-${organ.id}`}>
                    <span className="review-visual"><OrganVisual organ={organ} size={36} suffix="-review" /></span>
                    <span>
                      <b>{organ.name}</b>
                      <small>{g.answer}: {primaryName(organ)}{viewMode === "both" ? ` · ${g.viewLabel[answerView(organ)]}` : ""}</small>
                    </span>
                    <em>{label}</em>
                    {result !== "correct" && organ.tracked && <Link href={`/atlas?organ=${organ.id}`}>{g.study}</Link>}
                  </li>
                );
              })}
            </ul>
            <p className="result-saved">{signedIn ? g.saved : <Link href="/login?next=%2Fjuego">{g.signInToSave}</Link>}</p>
            <div className="result-actions">
              <button type="button" className="btn btn-outline" onClick={() => setPhase("setup")}><Settings2 size={16} /> {g.changeMode}</button>
              <button type="button" className="btn btn-primary" onClick={start} data-testid="game-play-again"><RotateCcw size={16} /> {g.playAgain}</button>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}
