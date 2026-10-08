"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../i18n/client";

type Day = { day: string; count: number };

function label(day: string, format: Intl.DateTimeFormat) {
  return format.format(new Date(`${day}T12:00:00Z`));
}

/**
 * Columnas de actividad diaria (una sola serie: el título la nombra, sin
 * leyenda). Tooltip por columna con objetivo de hover más grande que la marca
 * y tabla equivalente para lectores de pantalla.
 */
export function ActivityChart({ days }: { days: readonly Day[] }) {
  const { locale, m, t } = useI18n();
  const d = m.dashboard;
  const { dayFormat, shortFormat } = useMemo(
    () => ({
      dayFormat: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
      shortFormat: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }),
    }),
    [locale],
  );
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(4, ...days.map((entry) => entry.count));
  const total = days.reduce((sum, entry) => sum + entry.count, 0);
  const current = active === null ? null : days[active];

  return (
    <figure className="activity-chart">
      <figcaption>
        <span>{t(d.activityTitle, { days: days.length })}</span>
        <strong>{total} <small>{total === 1 ? d.event : d.events}</small></strong>
      </figcaption>
      <div className="chart-area" onMouseLeave={() => setActive(null)}>
        <div className="chart-gridlines" aria-hidden="true">
          <span data-value={max} />
          <span data-value={Math.round(max / 2)} />
          <span data-value={0} />
        </div>
        <ol className="chart-bars" aria-hidden="true">
          {days.map((entry, index) => (
            <li
              key={entry.day}
              className={active === index ? "active" : ""}
              data-zero={entry.count === 0 ? "" : undefined}
              onMouseEnter={() => setActive(index)}
              style={{ "--h": entry.count / max, "--i": index } as React.CSSProperties}
            >
              <i />
              <span>{index % 2 === days.length % 2 ? label(entry.day, shortFormat) : ""}</span>
            </li>
          ))}
        </ol>
        {current && (
          <div className="chart-tooltip" style={{ "--x": ((active ?? 0) + 0.5) / days.length } as React.CSSProperties}>
            <b>{label(current.day, dayFormat)}</b>
            <span>{current.count} {current.count === 1 ? d.event : d.events}</span>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{d.activityTable}</caption>
        <thead><tr><th scope="col">{d.dayColumn}</th><th scope="col">{d.eventsColumn}</th></tr></thead>
        <tbody>
          {days.map((entry) => (
            <tr key={entry.day}><td>{label(entry.day, dayFormat)}</td><td>{entry.count}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
