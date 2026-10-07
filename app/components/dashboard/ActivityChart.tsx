"use client";

import { useState } from "react";

type Day = { day: string; count: number };

const dayFormat = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const shortFormat = new Intl.DateTimeFormat("es-MX", { day: "numeric", timeZone: "UTC" });

function label(day: string, format: Intl.DateTimeFormat) {
  return format.format(new Date(`${day}T12:00:00Z`));
}

/**
 * Columnas de actividad diaria (una sola serie: el título la nombra, sin
 * leyenda). Tooltip por columna con objetivo de hover más grande que la marca
 * y tabla equivalente para lectores de pantalla.
 */
export function ActivityChart({ days }: { days: readonly Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(4, ...days.map((entry) => entry.count));
  const total = days.reduce((sum, entry) => sum + entry.count, 0);
  const current = active === null ? null : days[active];

  return (
    <figure className="activity-chart">
      <figcaption>
        <span>Actividad de estudio · últimos {days.length} días</span>
        <strong>{total} <small>eventos</small></strong>
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
            <span>{current.count} {current.count === 1 ? "evento" : "eventos"}</span>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Eventos de estudio por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Eventos</th></tr></thead>
        <tbody>
          {days.map((entry) => (
            <tr key={entry.day}><td>{label(entry.day, dayFormat)}</td><td>{entry.count}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
