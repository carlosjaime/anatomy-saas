"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Puzzle, Star } from "lucide-react";
import { useI18n } from "../../i18n/client";
import { DIFFICULTIES, GAME_MODES, type Difficulty, type GameMode } from "../../lib/game/scoring";

type Best = { score: number; mode: GameMode; difficulty: Difficulty };

/** Récord local del reto (los récords viven en el dispositivo, como en un juego). */
function readBest(): Best | null {
  let best: Best | null = null;
  try {
    for (const mode of GAME_MODES) {
      for (const difficulty of DIFFICULTIES) {
        const score = Number(window.localStorage.getItem(`atlas:game:best:${mode}:${difficulty}`));
        if (Number.isFinite(score) && score > (best?.score ?? 0)) best = { score, mode, difficulty };
      }
    }
  } catch {
    return null;
  }
  return best;
}

export function GameBestCard() {
  const { m, t } = useI18n();
  const g = m.game;
  const [best, setBest] = useState<Best | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee localStorage tras hidratar
    setBest(readBest());
  }, []);

  return (
    <section className="dash-card game-card" aria-labelledby="game-card-title">
      <span className="game-card-icon"><Puzzle size={22} /></span>
      <div>
        <span className="eyebrow">{g.kicker}</span>
        <h2 id="game-card-title">{g.title}</h2>
        <p>{g.cardText}</p>
        <p className="game-card-best">
          <Star size={14} />{" "}
          {best ? `${t(g.best, { score: best.score })} · ${g.modes[best.mode].name} · ${g.difficulties[best.difficulty].name}` : g.noBest}
        </p>
      </div>
      <Link className="btn btn-primary btn-shine" href="/juego">{g.cardCta} <ArrowRight size={16} /></Link>
    </section>
  );
}
