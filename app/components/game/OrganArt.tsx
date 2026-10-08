import type { ExtraOrganId } from "../../lib/game/body-map";

/**
 * Ilustraciones vectoriales de los órganos que solo existen en el reto (sin
 * modelo 3D ni fotografía en el atlas). Paleta cálida coherente con las
 * acuarelas del atlas; fondo transparente para integrarse sobre la figura.
 * Los ids de gradiente llevan prefijo por órgano y sufijo opcional para que
 * varias copias en la página no colisionen.
 */
type ArtProps = { id: ExtraOrganId; suffix?: string; className?: string };

export function OrganArt({ id, suffix = "", className = "" }: ArtProps) {
  const g = (name: string) => `art-${id}-${name}${suffix}`;
  const common = { className: `organ-art ${className}`, preserveAspectRatio: "xMidYMid meet", "aria-hidden": true, focusable: false } as const;

  switch (id) {
    case "stomach":
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <defs>
            <linearGradient id={g("body")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6b3a6" />
              <stop offset=".6" stopColor="#e3877a" />
              <stop offset="1" stopColor="#c8685e" />
            </linearGradient>
          </defs>
          <path d="M38 4 C38 12 40 19 44 26" fill="none" stroke="#d98b7a" strokeWidth="9" strokeLinecap="round" />
          <path
            d="M42 22 C62 14 86 26 88 48 C90 72 72 92 50 92 C37 92 28 85 23 78 L14 82 C9 76 11 68 18 65 L27 62 C33 71 41 75 50 74 C62 72 69 62 67 50 C65 40 57 36 47 38 Z"
            fill={`url(#${g("body")})`}
            stroke="#b65a50"
            strokeWidth="1.4"
          />
          <g fill="none" stroke="#fbd3c9" strokeWidth="1.6" strokeLinecap="round" opacity=".8">
            <path d="M54 30 C68 32 78 42 79 54" />
            <path d="M50 42 C62 44 72 52 74 64" />
            <path d="M44 80 C56 84 70 78 78 68" />
          </g>
          <path d="M18 70 C21 74 25 75 28 72" fill="none" stroke="#a64f46" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "spleen":
      return (
        <svg viewBox="0 0 70 98" {...common}>
          <defs>
            <linearGradient id={g("body")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b9566c" />
              <stop offset="1" stopColor="#6f2b47" />
            </linearGradient>
          </defs>
          <path
            d="M40 5 C58 9 66 30 62 52 C58 76 44 94 28 93 C14 91 8 78 14 66 C20 56 30 56 30 44 C30 30 22 22 26 12 C28 6 34 3 40 5 Z"
            fill={`url(#${g("body")})`}
            stroke="#5c2038"
            strokeWidth="1.4"
          />
          <path d="M33 30 C38 40 38 52 32 60" fill="none" stroke="#e7a3b5" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          <path d="M47 18 C54 30 55 46 50 62" fill="none" stroke="#f0c1cd" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
          <circle cx="31" cy="46" r="3" fill="#c94f4f" />
          <circle cx="34" cy="52" r="2.4" fill="#4f6fb8" />
        </svg>
      );
    case "bladder":
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <defs>
            <radialGradient id={g("body")} cx=".4" cy=".35" r=".75">
              <stop offset="0" stopColor="#fbd0c4" />
              <stop offset=".65" stopColor="#ec9f8e" />
              <stop offset="1" stopColor="#d27c6c" />
            </radialGradient>
          </defs>
          <path d="M12 4 C16 18 24 30 34 38 M88 4 C84 18 76 30 66 38" fill="none" stroke="#e7bd6a" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 28 C73 28 86 44 84 62 C82 79 67 90 50 90 C33 90 18 79 16 62 C14 44 27 28 50 28 Z" fill={`url(#${g("body")})`} stroke="#bd6a5b" strokeWidth="1.4" />
          <path d="M44 88 L46 98 M56 88 L54 98" stroke="#d48b7b" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 50 C40 44 60 44 70 50" fill="none" stroke="#fde3dc" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
          <path d="M36 64 L50 76 L64 64" fill="none" stroke="#c97a6b" strokeWidth="1.4" strokeLinejoin="round" opacity=".7" />
        </svg>
      );
    case "thyroid":
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <defs>
            <linearGradient id={g("lobe")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d26457" />
              <stop offset="1" stopColor="#9b3a35" />
            </linearGradient>
          </defs>
          <rect x="40" y="4" width="20" height="92" rx="9" fill="#e6eef2" stroke="#b9c8d1" strokeWidth="1.2" />
          {[14, 26, 38, 50, 62, 74, 86].map((y) => (
            <path key={y} d={`M41 ${y} H59`} stroke="#c3d2db" strokeWidth="3" strokeLinecap="round" />
          ))}
          <path d="M30 26 C18 30 14 52 18 70 C21 82 32 84 38 74 C44 64 46 46 42 34 C40 28 35 25 30 26 Z" fill={`url(#${g("lobe")})`} stroke="#7f2c29" strokeWidth="1.2" />
          <path d="M70 26 C82 30 86 52 82 70 C79 82 68 84 62 74 C56 64 54 46 58 34 C60 28 65 25 70 26 Z" fill={`url(#${g("lobe")})`} stroke="#7f2c29" strokeWidth="1.2" />
          <path d="M38 60 C46 66 54 66 62 60 L62 70 C54 76 46 76 38 70 Z" fill="#b84a43" stroke="#7f2c29" strokeWidth="1" />
          <path d="M24 44 C24 54 26 62 30 68 M76 44 C76 54 74 62 70 68" fill="none" stroke="#efa092" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
        </svg>
      );
    case "gallbladder":
      return (
        <svg viewBox="0 0 70 91" {...common}>
          <defs>
            <linearGradient id={g("body")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b6d27e" />
              <stop offset=".6" stopColor="#7fa94c" />
              <stop offset="1" stopColor="#557f33" />
            </linearGradient>
          </defs>
          <path d="M35 4 C35 10 40 14 46 14" fill="none" stroke="#7f9f52" strokeWidth="5" strokeLinecap="round" />
          <path d="M35 12 C48 12 58 26 58 44 C58 66 48 86 35 88 C22 86 12 66 12 44 C12 26 22 12 35 12 Z" fill={`url(#${g("body")})`} stroke="#4c6f2d" strokeWidth="1.4" />
          <path d="M24 36 C24 54 28 70 34 80" fill="none" stroke="#dcedb9" strokeWidth="2" strokeLinecap="round" opacity=".75" />
          <ellipse cx="42" cy="66" rx="5" ry="4" fill="#f2e3a8" opacity=".85" />
        </svg>
      );
    case "adrenals":
      return (
        <svg viewBox="0 0 100 100" {...common}>
          <defs>
            <linearGradient id={g("body")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6d27a" />
              <stop offset="1" stopColor="#d9922b" />
            </linearGradient>
          </defs>
          <path d="M14 96 C14 74 30 62 50 62 C70 62 86 74 86 96" fill="#e9a79c" opacity=".55" />
          <path d="M16 72 C20 44 38 18 52 14 C66 20 82 44 84 72 C66 62 34 62 16 72 Z" fill={`url(#${g("body")})`} stroke="#b37319" strokeWidth="1.4" />
          <path d="M34 54 C40 40 46 30 52 26 M60 34 C66 42 70 50 72 60" fill="none" stroke="#fdeab8" strokeWidth="1.8" strokeLinecap="round" opacity=".8" />
        </svg>
      );
    case "spinalCord":
      return (
        <svg viewBox="0 0 40 280" {...common}>
          <defs>
            <linearGradient id={g("cord")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e9bf6f" />
              <stop offset=".5" stopColor="#fbe7b8" />
              <stop offset="1" stopColor="#e2b25e" />
            </linearGradient>
          </defs>
          {Array.from({ length: 17 }, (_, index) => (
            <rect key={index} x="7" y={6 + index * 16} width="26" height="12" rx="5" fill="#f3e9da" stroke="#d6c3a5" strokeWidth="1" opacity=".9" />
          ))}
          <path d="M14 4 C14 70 15 150 17 214 L20 236 L23 214 C25 150 26 70 26 4 Z" fill={`url(#${g("cord")})`} stroke="#c9963f" strokeWidth="1.2" />
          <path d="M20 8 V214" stroke="#d7a64f" strokeWidth=".8" opacity=".7" />
          {Array.from({ length: 12 }, (_, index) => {
            const y = 18 + index * 16;
            return <path key={index} d={`M14 ${y} L6 ${y + 5} M26 ${y} L34 ${y + 5}`} stroke="#e0b464" strokeWidth="1.4" strokeLinecap="round" />;
          })}
          <path d="M18 230 L14 276 M20 232 L19 278 M22 230 L25 276 M17 226 L10 270 M23 226 L30 270" stroke="#e5bb6c" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
  }
}
