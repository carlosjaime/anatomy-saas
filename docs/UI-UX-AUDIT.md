# Auditoría UI/UX

Herramienta: **Impeccable 4.7.0** (`pbakaus/impeccable@dad8dbb`), skill instalada en `.claude/skills/impeccable` con sus hooks (`.claude/settings.json`) y el detector como dependencia de desarrollo (`npm run design:detect`). El detector se ejecutó contra el **build de producción** (`next start`, `ATLAS_E2E=1`) con Chromium de Playwright.

> El instalador oficial (`npx impeccable install`) descarga el paquete desde `impeccable.style`, dominio bloqueado por la política de red de este entorno. Se instaló la misma versión desde el repositorio oficial (`plugin/skills/impeccable`), que es el build de Claude Code que ese instalador coloca.

## Resultado del detector

Páginas: `/`, `/juego`, `/login`, `/registro`, `/acerca`. (`/atlas` excede la espera de navegación de 30 s del detector porque el visor mantiene el lienzo activo; se auditó con capturas manuales y E2E.)

| Regla | Antes | Después | Acción |
|---|---:|---:|---|
| low-contrast | 39 | 4 | Tokens de texto (`--muted` 5.6:1), placeholder 4.8:1, bandas navy planas. Los 4 restantes son falsos positivos: el detector muestrea el diálogo de configuración del reto a media animación `zoomIn`/bajo el telón; el color real es `--muted`. |
| ai-color-palette | 15 | 0 | Fuera degradados cian/turquesa; paleta navy/azul médico. |
| undersized-ui-text | 13 | 1 | Piso de 11 px. El restante (8.8 px) es texto de 11 px escalado por la animación `zoomIn` (falso positivo). |
| kicker-above-heading / hero-eyebrow-chip | 8 | 0 | Eliminadas las etiquetas sobre títulos (landing, Acerca de, Mi cuenta) y sus cadenas. |
| radial-spotlight-glow | 5 | 0 | CTA final, panel de autenticación y "Desarrollado por" en navy plano. |
| marquee (`.btn-shine`) | 3 | 0 | Eliminado el brillo infinito. |
| bounce-easing | 3 | 0 | `--ease-spring` eliminado; una sola curva de salida. |
| icon-tile-stack | 5 | 10 | Pendiente (ver abajo). Subió porque ahora el detector ve las tarjetas que antes ocultaba el ruido de color. |
| straggler | 6 | 7 | Pendiente: viudas tipográficas en copys largos. |
| overused-font | 3 | 3 | Decisión: se conserva Plus Jakarta Sans (legible y ya cargada); cambiarla es una decisión de marca. |
| shape-assembled-illustration | 2 | 2 | La figura SVG del reto es intencional (mapa anatómico del juego). |
| text-occlusion | 2 | 2 | Falso positivo: etiquetas "D/I" del reto bajo el diálogo inicial. |
| nested-cards | 1 | 1 | Pendiente: tarjeta dentro de tarjeta en el reto. |
| italic-serif-display | 0 | 1 | El énfasis en cursiva del título del hero (en-US); aceptado. |
| **Total** | **105** | **31** | |

## Revisión manual (capturas claro/oscuro, 1440 px y 390 px)

Corregido:
- Tema oscuro completo por tokens; la fila de órgano seleccionado, tarjetas con degradado blanco, pastillas de estado y banners eran ilegibles en la primera pasada oscura y se corrigieron con tokens semánticos.
- Las láminas con `multiply` se oscurecían sobre superficies oscuras → `--img-blend`.
- Pedestal 3D blanco sobre lienzo oscuro → sigue el tema.
- Íconos de "Datos clave" con glifos Unicode (◇ ♙ ⌁ …) → Lucide.
- Rotación y Reiniciar compartían icono → `Rotate3d` / `RotateCcw`.
- Aviso de modelo ilustrativo: primero se colocó sobre el lienzo y tapaba el espécimen en móvil; se movió al panel de información.

Pendiente (prioridad descendente):
1. `icon-tile-stack` en "Plataforma" (landing) y pilares de "Acerca de": rediseñar como lista con icono en línea.
2. Viudas tipográficas (`text-wrap: pretty` en párrafos de sección).
3. Tarjeta anidada en la pantalla de configuración del reto.
4. Logo de DevHive servido desde `i.ibb.co` (host externo): si falla, el texto alternativo desborda el pie compacto. Debe alojarse en `public/`.

## Accesibilidad verificada

- Contraste AA de todos los pares de tokens (tabla en `DESIGN.md`).
- Foco visible con `--focus` en ambos temas; control segmentado y barra del visor accesibles con teclado (`role="radiogroup"`, `role="toolbar"`, `aria-pressed`).
- Estados con texto, no solo color (pastillas, banners, historial "En revisión").
- `prefers-reduced-motion` sigue desactivando animaciones (sin cambios en esa capa).
