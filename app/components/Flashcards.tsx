"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import type { OrganId } from "../lib/anatomy-data";
import { useI18n } from "../i18n/client";
import { useAtlasContent } from "./atlas/AtlasContent";

export type Flashcard = {
  /** Estable entre idiomas (por posición), para conservar el progreso al cambiar de idioma. */
  id: string;
  front: string;
  back: string;
  hint: string;
  organId?: OrganId;
  free: boolean;
};

type Props = {
  canAccessAll: boolean;
  onUpgrade: () => void;
};

export function Flashcards({ canAccessAll, onUpgrade }: Props) {
  const { m, t } = useI18n();
  const f = m.flashcards;
  const { glossary, organs, organById } = useAtlasContent();
  const [deck, setDeck] = useState<OrganId | "all">("all");

  // Mazo completo: términos del glosario y estructuras de cada órgano.
  const allCards = useMemo<Flashcard[]>(
    () => [
      ...glossary.map((entry, index) => ({
        id: `term:${index}`,
        front: entry.term,
        back: entry.definition,
        hint: entry.organId ? t(f.glossaryHint, { organ: organById[entry.organId].name }) : f.glossaryGeneral,
        organId: entry.organId,
        free: !entry.organId || organById[entry.organId].tier === "free",
      })),
      ...organs.flatMap((organ) =>
        organ.hotspots.map((hotspot) => ({
          id: `structure:${organ.id}:${hotspot.id}`,
          front: hotspot.label,
          back: t(f.structureBack, { detail: hotspot.detail, organ: organ.name.toLowerCase(), system: organ.system.toLowerCase() }),
          hint: t(f.structureHint, { organ: organ.name }),
          organId: organ.id,
          free: organ.tier === "free",
        })),
      ),
    ],
    [glossary, organs, organById, f, t],
  );

  const { cards, lockedCount } = useMemo(() => {
    const inDeck = allCards.filter((card) => deck === "all" || card.organId === deck);
    const unlocked = inDeck.filter((card) => canAccessAll || card.free);
    return { cards: unlocked, lockedCount: inDeck.length - unlocked.length };
  }, [allCards, deck, canAccessAll]);

  return (
    <div className="flashcards">
      <div className="deck-chips" role="group" aria-label={f.deck}>
        <button type="button" className={deck === "all" ? "active" : ""} onClick={() => setDeck("all")}>{f.all}</button>
        {organs.map((organ) => (
          <button key={organ.id} type="button" className={deck === organ.id ? "active" : ""} onClick={() => setDeck(organ.id)}>
            {organ.name}
            {!canAccessAll && organ.tier === "pro" && <Lock size={11} aria-label={m.common.proContent} />}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="ency-locked animate__animated animate__fadeIn">
          <Lock size={20} />
          <p>{f.lockedDeck}</p>
          <button type="button" className="lesson-button clinical" onClick={onUpgrade}>
            {f.seePlans} <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        // `key` reinicia el progreso al cambiar de mazo (no al cambiar de idioma).
        <Deck key={`${deck}-${canAccessAll}`} cards={cards} />
      )}

      {lockedCount > 0 && cards.length > 0 && (
        <button type="button" className="locked-more" onClick={onUpgrade}>
          <Lock size={13} /> {t(f.moreLocked, { count: lockedCount })}
        </button>
      )}
    </div>
  );
}

function Deck({ cards }: { cards: readonly Flashcard[] }) {
  const { m, t } = useI18n();
  const f = m.flashcards;
  const [order, setOrder] = useState(() => cards.map((_, index) => index));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<ReadonlySet<string>>(new Set());

  const finished = position >= order.length;
  const card = finished ? null : cards[order[position]];
  const progress = Math.round((Math.min(position, order.length) / order.length) * 100);

  const go = (next: number) => {
    setFlipped(false);
    setPosition(Math.max(0, Math.min(order.length, next)));
  };

  const mark = (isKnown: boolean) => {
    if (!card) return;
    setKnown((current) => {
      const next = new Set(current);
      if (isKnown) next.add(card.id);
      else next.delete(card.id);
      return next;
    });
    go(position + 1);
  };

  const shuffle = () => {
    const next = [...order];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    go(0);
  };

  /** Repasa solo las tarjetas que todavía no se marcaron como sabidas. */
  const reviewPending = () => {
    const pending = order.filter((index) => !known.has(cards[index].id));
    setOrder(pending.length > 0 ? pending : cards.map((_, index) => index));
    go(0);
  };

  const restart = () => {
    setOrder(cards.map((_, index) => index));
    setKnown(new Set());
    go(0);
  };

  return (
    <div className="deck">
      <div className="deck-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <p className="deck-status" aria-live="polite">
        {finished ? f.done : t(f.progress, { n: position + 1, total: order.length })} · {t(f.mastered, { count: known.size })}
      </p>

      {card ? (
        <button
          type="button"
          key={card.id}
          className={`flashcard ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((value) => !value)}
          aria-label={flipped ? t(f.answer, { text: card.back }) : t(f.question, { text: card.front })}
        >
          <span className="flashcard-inner">
            <span className="flashcard-face front">
              <small>{card.hint}</small>
              <strong>{card.front}</strong>
              <em>{f.flip}</em>
            </span>
            <span className="flashcard-face back">
              <small>{card.front}</small>
              <span>{card.back}</span>
            </span>
          </span>
        </button>
      ) : (
        <div className="deck-done">
          <Check size={28} className="animate__animated animate__tada" />
          <strong>{f.great}</strong>
          <p>{t(f.summary, { known: known.size, total: cards.length })}</p>
          <div>
            <button type="button" onClick={reviewPending}><Undo2 size={15} /> {f.reviewPending}</button>
            <button type="button" onClick={restart}><RotateCcw size={15} /> {f.restart}</button>
          </div>
        </div>
      )}

      {card && (
        <div className="deck-actions">
          <button type="button" className="icon" onClick={() => go(position - 1)} disabled={position === 0} aria-label={f.previous}>
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="review" onClick={() => mark(false)}>{f.review}</button>
          <button type="button" className="known" onClick={() => mark(true)}><Check size={15} /> {f.know}</button>
          <button type="button" className="icon" onClick={shuffle} aria-label={f.shuffle}>
            <Shuffle size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
