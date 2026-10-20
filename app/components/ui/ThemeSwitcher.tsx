"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "../../i18n/client";
import { THEMES, applyTheme, type Theme } from "../../lib/theme";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Selector de tema. Aplica el cambio al instante en `<html data-theme>` y lo
 * persiste en una cookie para que el servidor lo renderice sin parpadeo.
 */
export function ThemeSwitcher({ initial }: { initial: Theme }) {
  const { m } = useI18n();
  const [theme, setTheme] = useState<Theme>(initial);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="segmented" role="radiogroup" aria-label={m.account.theme}>
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={theme === option}
            className={theme === option ? "active" : undefined}
            onClick={() => choose(option)}
            data-testid={`theme-${option}`}
          >
            <Icon size={15} aria-hidden="true" /> {m.account.themes[option]}
          </button>
        );
      })}
    </div>
  );
}
