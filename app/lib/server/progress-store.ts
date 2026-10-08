import { and, desc, eq, gt } from "drizzle-orm";
import type { Database } from "../../../db";
import { studyEvents, type StudyEventKind, type StudyEventRow } from "../../../db/schema";
import { organs, type OrganId } from "../anatomy-data";

/** Una vista repetida del mismo órgano dentro de esta ventana no se registra. */
export const VIEW_DEDUPE_MS = 10 * 60 * 1000;
const HISTORY_LIMIT = 5000;
export const ACTIVITY_DAYS = 14;
export const DEFAULT_TIME_ZONE = "America/Mexico_City";

export type StudyEventInput = { organId: OrganId; kind: StudyEventKind; correct?: boolean };

export async function recordStudyEvent(db: Database, userId: string, event: StudyEventInput, now = Date.now()): Promise<boolean> {
  if (event.kind === "view") {
    const recent = await db
      .select({ id: studyEvents.id })
      .from(studyEvents)
      .where(
        and(
          eq(studyEvents.userId, userId),
          eq(studyEvents.organId, event.organId),
          eq(studyEvents.kind, "view"),
          gt(studyEvents.createdAt, now - VIEW_DEDUPE_MS),
        ),
      )
      .get();
    if (recent) return false;
  }
  await db.insert(studyEvents).values({
    userId,
    organId: event.organId,
    kind: event.kind,
    correct: event.kind === "quiz" || event.kind === "placement" ? (event.correct ? 1 : 0) : null,
    createdAt: now,
  });
  return true;
}

export type OrganProgress = {
  organId: OrganId;
  views: number;
  quizAttempts: number;
  quizCorrect: number;
  toursCompleted: number;
  lastStudiedAt: number | null;
  /** 0–100: exploración (25) + recorrido guiado (35) + precisión en cuestionario (40). */
  mastery: number;
};

export type DashboardStats = {
  organs: OrganProgress[];
  organsStudied: number;
  quizAttempts: number;
  quizAccuracy: number | null;
  toursCompleted: number;
  streakDays: number;
  activity: { day: string; count: number }[];
  recent: { organId: OrganId; kind: StudyEventKind; correct: boolean | null; createdAt: number }[];
  averageMastery: number;
};

export function dayKey(timestamp: number, timeZone: string): string {
  // en-CA formatea como AAAA-MM-DD, ordenable lexicográficamente.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(timestamp);
}

function shiftDay(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Días consecutivos con actividad que terminan hoy o ayer. */
export function computeStreak(activeDays: ReadonlySet<string>, today: string): number {
  let cursor = activeDays.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

const KNOWN_ORGANS = new Set<string>(organs.map((organ) => organ.id));

export function aggregateStats(rows: readonly StudyEventRow[], now: number, timeZone = DEFAULT_TIME_ZONE): DashboardStats {
  const byOrgan = new Map<OrganId, OrganProgress>(
    organs.map((organ) => [
      organ.id,
      { organId: organ.id, views: 0, quizAttempts: 0, quizCorrect: 0, toursCompleted: 0, lastStudiedAt: null, mastery: 0 },
    ]),
  );
  const activeDays = new Set<string>();
  const perDay = new Map<string, number>();

  for (const row of rows) {
    if (!KNOWN_ORGANS.has(row.organId)) continue;
    const progress = byOrgan.get(row.organId as OrganId)!;
    if (row.kind === "view") progress.views += 1;
    if (row.kind === "tour") progress.toursCompleted += 1;
    if (row.kind === "quiz") {
      progress.quizAttempts += 1;
      if (row.correct === 1) progress.quizCorrect += 1;
    }
    progress.lastStudiedAt = Math.max(progress.lastStudiedAt ?? 0, row.createdAt);
    const key = dayKey(row.createdAt, timeZone);
    activeDays.add(key);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  let quizAttempts = 0;
  let quizCorrect = 0;
  let toursCompleted = 0;
  for (const progress of byOrgan.values()) {
    const accuracy = progress.quizAttempts > 0 ? progress.quizCorrect / progress.quizAttempts : 0;
    progress.mastery = Math.round(
      (progress.views > 0 ? 25 : 0) + (progress.toursCompleted > 0 ? 35 : 0) + 40 * accuracy,
    );
    quizAttempts += progress.quizAttempts;
    quizCorrect += progress.quizCorrect;
    toursCompleted += progress.toursCompleted;
  }

  const today = dayKey(now, timeZone);
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const day = shiftDay(today, index - (ACTIVITY_DAYS - 1));
    return { day, count: perDay.get(day) ?? 0 };
  });
  const organList = [...byOrgan.values()];

  return {
    organs: organList,
    organsStudied: organList.filter((progress) => progress.lastStudiedAt !== null).length,
    quizAttempts,
    quizAccuracy: quizAttempts > 0 ? Math.round((quizCorrect / quizAttempts) * 100) : null,
    toursCompleted,
    streakDays: computeStreak(activeDays, today),
    activity,
    recent: rows.slice(0, 8).filter((row) => KNOWN_ORGANS.has(row.organId)).map((row) => ({
      organId: row.organId as OrganId,
      kind: row.kind,
      correct: row.correct === null ? null : row.correct === 1,
      createdAt: row.createdAt,
    })),
    averageMastery: Math.round(organList.reduce((sum, progress) => sum + progress.mastery, 0) / organList.length),
  };
}

export async function getDashboardStats(db: Database, userId: string, now = Date.now(), timeZone = DEFAULT_TIME_ZONE): Promise<DashboardStats> {
  const rows = await db
    .select()
    .from(studyEvents)
    .where(eq(studyEvents.userId, userId))
    .orderBy(desc(studyEvents.createdAt), desc(studyEvents.id))
    .limit(HISTORY_LIMIT);
  return aggregateStats(rows, now, timeZone);
}
