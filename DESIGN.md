---
name: Atlas Anatómico
description: Atlas clínico de anatomía 3D — sobrio, preciso y legible en claro y oscuro.
colors:
  navy: "#10243a"
  medical-blue: "#176b99"
  interaction-blue: "#1677b8"
  interaction-blue-hover: "#125f93"
  clinical-teal: "#20a6a2"
  clinical-teal-ink: "#136c69"
  canvas: "#f5f8fb"
  surface: "#ffffff"
  surface-2: "#eef3f8"
  ink: "#152535"
  muted: "#526579"
  placeholder: "#637487"
  coral: "#c94f3d"
  success-ink: "#1d6e4d"
  warning-ink: "#7a5212"
  danger-ink: "#a33a2b"
  info-ink: "#3b45b0"
  dark-canvas: "#0b1724"
  dark-surface: "#10243a"
  dark-surface-2: "#162c44"
  dark-ink: "#e6eef5"
  dark-muted: "#a9bbcc"
  dark-action: "#5fb3e6"
  dark-action-ink: "#0b1724"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(2.4rem, 5vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.05
  headline:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  control: "10px"
  input: "12px"
  card: "20px"
  panel: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.interaction-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.interaction-blue-hover}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  status-active:
    textColor: "{colors.success-ink}"
    rounded: "{rounded.pill}"
  dark-band:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

# Design System: Atlas Anatómico

## Overview

**Norte creativo: "La lámina clínica".** El espécimen 3D es la lámina; la interfaz es el margen del atlas que la rodea: precisa, silenciosa, al servicio de la lectura. Rigor científico y confianza antes que espectáculo.

- Tono: sobrio, clínico, institucional. Nada futurista ni neón.
- El color comunica acción, selección y estado; la anatomía aporta los únicos colores cálidos.
- Anti-referencias: degradados decorativos, brillos en bucle, rebotes, etiquetas tipo "eyebrow" sobre títulos, cian sobre oscuro.
- Fuente de verdad: los tokens de `app/globals.css` (`:root`). Este documento los describe; si difieren, manda el CSS.

## Colors

Paleta del propietario (PRODUCT.md), con roles semánticos y contraste verificado (WCAG 2.2 AA):

| Rol | Claro | Oscuro | Contraste verificado |
|---|---|---|---|
| Lienzo `--canvas` | `#F5F8FB` | `#0B1724` | — |
| Superficie `--surface` | `#FFFFFF` | `#10243A` (navy) | — |
| Texto `--ink` | `#152535` | `#E6EEF5` | 14.6:1 · 13.4:1 |
| Secundario `--muted` | `#526579` | `#A9BBCC` | 5.6:1 · 8.0:1 |
| Placeholder | `#637487` | `#8EA3B7` | 4.8:1 · 6.0:1 |
| Marca `--clinical` (azul médico) | `#176B99` | `#5FB3E6` | 5.5:1 sobre lienzo |
| Acción `--action` | `#1677B8` | `#5FB3E6` | blanco sobre acción 4.8:1; `#0B1724` sobre acción oscura |
| Turquesa clínico `--teal` | `#20A6A2` | — | 2.8:1: **solo gráficos y acentos no textuales**; texto turquesa usa `--teal-ink` `#136C69` (5.8:1) |
| Navy `--navy` | `#10243A` | — | bandas oscuras (CTA final, panel de autenticación) |

Reglas:
- Translucidez con canales: `rgb(var(--clinical-rgb) / .1)`, `rgb(var(--surface-rgb) / .8)`, `rgb(var(--tint-rgb) / .12)`; así cada tema remapea un solo token.
- Estados con texto semántico (`--success-ink`, `--warning-ink`, `--danger-ink`, `--info-ink`) sobre fondos pastel; nunca solo color: siempre hay texto o icono.
- Las láminas anatómicas (ilustraciones `.webp` de fondo claro) se integran con `mix-blend-mode: var(--img-blend)`: `multiply` en claro, `normal` en oscuro (se muestran como placas).
- Tema: `prefers-color-scheme` por defecto; `data-theme="light|dark"` en `<html>` desde la cookie `atlas_theme` (Mi cuenta → Preferencias). El pedestal 3D sigue el tema.

## Typography

- **Source Serif 4** para títulos y nombres de órganos: voz de publicación médica.
- **Plus Jakarta Sans** para interfaz, datos y lectura de controles.
- Piso de legibilidad: **11 px** para cualquier texto funcional (etiquetas, pastillas, barras de pestañas). No hay texto de 8–10 px.
- Etiquetas en versalitas espaciadas (`letter-spacing .1–.14em`) solo para encabezados de grupo dentro de paneles (p. ej. "Biblioteca de órganos"), nunca como "kicker" encima de un título.
- Números tabulares (`font-variant-numeric: tabular-nums`) en importes e historial de pagos.

## Layout

- Mobile-first. Puntos de corte en uso: 420/480/520, 760/780 (tabbar móvil y LOD ligero), 900, 1040/1100, 1240/1350.
- Explorador: biblioteca lateral · espécimen central (máxima superficie) · panel contextual. En ≤780 px el espécimen ocupa el ancho completo, la barra de herramientas pasa a horizontal y la navegación a tabbar inferior.
- Ritmo: grupos apretados (4–8 px), separación generosa entre bloques (14–32 px); más aire arriba de un título que debajo.

## Elevation & Depth

Plano y tonal. Las superficies se distinguen por `--surface`/`--surface-2` y bordes `--line`; las sombras son ambientales y suaves (`--shadow`: desplazamiento vertical + desenfoque amplio, opacidad ≤ .06 en claro). Sin halos de color con desplazamiento cero ni resplandores radiales.

## Shapes

Radios: controles 10 px, campos 12 px, tarjetas 20 px, paneles 22 px, pastillas 999 px. Botones de herramienta del visor: 12 px. Bordes de 1 px; nunca bordes laterales de color como acento.

## Components

- **Botón primario:** fondo `--action`, texto `--on-action`; hover `--action-hover`; sin brillo animado. Foco: contorno 2 px `--focus` con separación 3 px.
- **Tarjeta (`.dash-card`, `.plan-card`):** superficie plana, borde `--line`, radio 20 px. Prohibido anidar tarjetas.
- **Pastilla de estado (`.status-pill`):** fondo semántico translúcido + `--*-ink`, siempre con texto.
- **Control segmentado (`.segmented`):** selección de tema; `role="radiogroup"`, objetivo táctil ≥ 40 px.
- **Barra del visor:** 9 herramientas con icono Lucide (trazo 1.65) + etiqueta: rotación, vista anatómica (anterior/lat. izq./posterior/lat. der.), acercar, aislar, corte, malla, comparar, captura, reiniciar.
- **Historial de pagos:** tabla con encabezados `scope="col"`, importes alineados a la derecha, desplazamiento horizontal accesible por teclado.

## Do's and Don'ts

- **Sí:** dejar que el espécimen sea lo más grande de la pantalla; usar `--clinical` para lo seleccionado y `--action` para lo accionable; nombrar estados con texto; revisar ambos temas en cada cambio.
- **Sí:** iconos de `lucide-react`; nunca glifos Unicode o emoji como iconos.
- **No:** degradados decorativos, brillos en bucle, curvas con sobreimpulso, etiquetas "eyebrow" sobre títulos, texto turquesa `#20A6A2` sobre claro, tarjetas dentro de tarjetas.
- **No:** prometer en la interfaz funciones o estructuras anatómicas que no estén implementadas.
