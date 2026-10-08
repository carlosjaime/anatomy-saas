"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameSound = "pick" | "correct" | "partial" | "wrong" | "combo" | "finish";

const MUTE_KEY = "atlas:game:muted";

/** Notas (Hz) y duración por efecto: tonos breves y suaves, sin archivos de audio. */
const PATTERNS: Record<GameSound, { notes: readonly number[]; step: number; type: OscillatorType; gain: number }> = {
  pick: { notes: [660], step: 0.05, type: "sine", gain: 0.05 },
  correct: { notes: [660, 990], step: 0.09, type: "sine", gain: 0.08 },
  partial: { notes: [660, 740], step: 0.1, type: "triangle", gain: 0.07 },
  wrong: { notes: [220, 180], step: 0.12, type: "triangle", gain: 0.08 },
  combo: { notes: [784, 988, 1175], step: 0.07, type: "sine", gain: 0.07 },
  finish: { notes: [523, 659, 784, 1047], step: 0.12, type: "sine", gain: 0.08 },
};

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Efectos de sonido sintetizados con Web Audio. El contexto se crea en el
 * primer gesto del usuario (política de autoplay) y se respeta la preferencia
 * de silencio guardada.
 */
export function useGameAudio() {
  const context = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // Preferencia del navegador: solo existe en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage tras hidratar
    setMuted(readMuted());
    return () => {
      void context.current?.close().catch(() => undefined);
    };
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((value) => {
      try {
        window.localStorage.setItem(MUTE_KEY, value ? "0" : "1");
      } catch {
        // Sin almacenamiento: la preferencia dura solo esta sesión.
      }
      return !value;
    });
  }, []);

  const play = useCallback(
    (sound: GameSound) => {
      if (muted || typeof window === "undefined") return;
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      try {
        context.current ??= new AudioCtor();
        const ctx = context.current;
        if (ctx.state === "suspended") void ctx.resume();
        const { notes, step, type, gain } = PATTERNS[sound];
        const start = ctx.currentTime + 0.01;
        notes.forEach((frequency, index) => {
          const osc = ctx.createOscillator();
          const volume = ctx.createGain();
          const at = start + index * step;
          osc.type = type;
          osc.frequency.setValueAtTime(frequency, at);
          volume.gain.setValueAtTime(0.0001, at);
          volume.gain.exponentialRampToValueAtTime(gain, at + 0.015);
          volume.gain.exponentialRampToValueAtTime(0.0001, at + step * 1.8);
          osc.connect(volume).connect(ctx.destination);
          osc.start(at);
          osc.stop(at + step * 2);
        });
      } catch {
        // El audio es decorativo: cualquier fallo se ignora.
      }
    },
    [muted],
  );

  return { muted, toggleMuted, play };
}
