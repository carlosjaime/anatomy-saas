"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import { glossary } from "../lib/encyclopedia-data";
import { organById, organs, type OrganId } from "../lib/anatomy-data";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  hint: string;
  organId?: OrganId;
};

/** Mazo completo: términos del glosario y estructuras de cada órgano. */
const ALL_CARDS: readonly Flashcard[] = [
  ...glossary.map((entry) => ({
    id: `term:${entry.term}`,
    front: entry.term,
    back: entry.definition,
    hint: entry.organId ? `Glosario · ${organById[entry.organId].name}` : "Glosario general",
    organId: entry.organId,
  })),
  ...organs.flatMap((organ) =>
    organ.hotspots.map((hotspot) => ({
      id: `structure:${organ.id}:${hotspot.id}`,
      front: hotspot.label,
      back: `${hotspot.detail}. Estructura del ${organ.name.toLowerCase()} (${organ.system.toLowerCase()}).`,
      hint: `Estructura · ${organ.name}`,
      organId: organ.id,
    })),
  ),
];

/** Las tarjetas de órganos "pro" requieren un plan de pago. */
function isAccessible(card: Flashcard, canAccessAll: boolean) {
  return canAccessAll || !card.organId || organById[card.organId].tier === "free";
}

type Props = {
  canAccessAll: boolean;
  onUpgrade: () => void;
};

export function Flashcards({ canAccessAll, onUpgrade }: Props) {
  const [deck, setDeck] = useState<OrganId | "all">("all");

  const { cards, lockedCount } = useMemo(() => {
    const inDeck = ALL_CARDS.filter((card) => deck === "all" || card.organId === deck);
    const unlocked = inDeck.filter((card) => isAccessible(card, canAccessAll));
    return { cards: unlocked, lockedCount: inDeck.length - unlocked.length };
  }, [deck, canAccessAll]);

  return (
    <div className="flashcards">
      <div className="deck-chips" role="group" aria-label="Elegir mazo">
        <button type="button" className={deck === "all" ? "active" : ""} onClick={() => setDeck("all")}>Todos</button>
        {organs.map((organ) => (
          <button
            key={organ.id}
            type="button"
            className={deck === organ.id ? "active" : ""}
            onClick={() => setDeck(organ.id)}
          >
            {organ.name}
            {!canAccessAll && organ.tier === "pro" && <Lock size={11} aria-label="Contenido Pro" />}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="ency-locked">
          <Lock size={20} />
          <p>Las tarjetas de este órgano forman parte del plan Estudiante.</p>
          <button type="button" className="lesson-button clinical" onClick={onUpgrade}>
            Ver planes en MXN <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        // `key` reinicia el progreso al cambiar de mazo.
        <Deck key={`${deck}-${canAccessAll}`} cards={cards} />
      )}

      {lockedCount > 0 && cards.length > 0 && (
        <button type="button" className="locked-more" onClick={onUpgrade}>
          <Lock size={13} /> {lockedCount} tarjetas más con el plan Estudiante
        </button>
      )}
    </div>
  );
}

function Deck({ cards }: { cards: readonly Flashcard[] }) {
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
        {finished ? "Mazo completado" : `Tarjeta ${position + 1} de ${order.length}`} · {known.size} dominadas
      </p>

      {card ? (
        <button
          type="button"
          key={card.id}
          className={`flashcard ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((value) => !value)}
          aria-label={flipped ? `Respuesta: ${card.back}` : `${card.front}. Toca para ver la respuesta`}
        >
          <span className="flashcard-inner">
            <span className="flashcard-face front">
              <small>{card.hint}</small>
              <strong>{card.front}</strong>
              <em>Toca para voltear</em>
            </span>
            <span className="flashcard-face back">
              <small>{card.front}</small>
              <span>{card.back}</span>
            </span>
          </span>
        </button>
      ) : (
        <div className="deck-done">
          <Check size={28} />
          <strong>¡Buen trabajo!</strong>
          <p>Dominaste {known.size} de {cards.length} tarjetas.</p>
          <div>
            <button type="button" onClick={reviewPending}><Undo2 size={15} /> Repasar pendientes</button>
            <button type="button" onClick={restart}><RotateCcw size={15} /> Reiniciar</button>
          </div>
        </div>
      )}

      {card && (
        <div className="deck-actions">
          <button type="button" className="icon" onClick={() => go(position - 1)} disabled={position === 0} aria-label="Tarjeta anterior">
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="review" onClick={() => mark(false)}>Repasar</button>
          <button type="button" className="known" onClick={() => mark(true)}><Check size={15} /> La sé</button>
          <button type="button" className="icon" onClick={shuffle} aria-label="Barajar">
            <Shuffle size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
