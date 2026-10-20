# Informe de implementación

Rama: `claude/medical-platform-redesign-emq79n`. Fecha: 2026-10-20.

## 1. Qué se encontró

| Área | Hallazgo | Severidad | Costo de atención |
|---|---|---|---|
| Stack | Next.js 16 (App Router, RSC), React 19, TypeScript estricto, Three.js 0.185 + GSAP, Drizzle (libSQL/Turso y Cloudflare D1), Tailwind 4 + CSS con tokens, vinext para Workers, Playwright. Base sana: lint, tipos y 47 pruebas en verde. | — | — |
| Modelos 3D | Los 9 GLB son **mallas generadas por IA (Tripo)**, de una pieza, sin segmentación; licencia no documentada; 300–390 k triángulos y texturas 2048² cada uno. | Crítica (licencia), Alta (precisión) | Alto |
| Pagos | Mercado Pago funcional con buena separación (`BillingProvider`). Se pedía PayPal. | — | Medio |
| Producto | El plan Institucional se vendía con "25 licencias" sin gestión de grupos: la compra daba una sola licencia. | **Alta** (promesa no implementada) | Bajo (bloquear) / Alto (construir) |
| UI | Impeccable: 105 hallazgos en 5 páginas (contraste insuficiente, texto de 8–10 px, degradados cian, brillos en bucle, rebotes, etiquetas sobre títulos). Sin tema oscuro. Glifos Unicode como iconos. | Media | Medio |
| Rendimiento | ~30 MB de modelos sin variante móvil; las pruebas del visor tardaban ~40 s con render por software. | Media | Bajo |
| Externos | Logo de DevHive servido desde `i.ibb.co`. | Baja | Bajo |

Detalle: `docs/UI-UX-AUDIT.md`, `docs/ANATOMY-MODELS.md`, `docs/ANATOMY-LICENSES.md`.

## 2. Qué se modificó (commits)

1. `chore(design)`: Impeccable 4.7.0 instalado localmente para Claude Code con hooks; `PRODUCT.md`.
2. `feat(billing)`: PayPal Subscriptions reemplaza a Mercado Pago (cliente OAuth2, proveedor, webhooks verificados e idempotentes, transacciones, rutas, migración v3, UI de cuenta, script de aprovisionamiento).
3. `feat(design)`: tokens navy/azul médico/turquesa, tema oscuro, correcciones de la auditoría, preferencias de tema e idioma.
4. `perf(3d)`: LOD1 de los 9 especímenes y selección automática; aviso de modelo ilustrativo; iconos Lucide.
5. `feat(atlas)`: vistas anatómicas (anterior, laterales, posterior) y captura PNG.
6. `fix(billing)`: Institucional deja de venderse hasta que exista la gestión de licencias.
7. `docs`: este informe, `DESIGN.md` y la carpeta `docs/`.

## 3. Componentes reutilizados

`BillingProvider`, `entitlement.ts` (reglas de acceso sin cambios), `handle`/`assertSameOrigin`/`readJson`, `consumeAttempt` (rate limit), migraciones versionadas, `ConfirmDialog`, `Toast`, `DashShell`, `LanguageSwitcher`, `PlansDialog`, `AnatomyViewer`/`AnatomyAssetManager`, el sistema i18n tipado y la suite Playwright con su modo `ATLAS_E2E`.

## 4. Modelos

- **Mejorados:** los 9 existentes, en rendimiento: LOD1 al 25 % de triángulos y texturas 1024² (30.0 → 8.3 MB; 3.12 M → 0.89 M triángulos; deriva de caja ≤ 0.07 %). Pedestal sincronizado con el tema, vistas anatómicas y captura.
- **No mejorados en precisión:** no se puede corregir anatomía de una malla única generada por IA sin una fuente anatómica; se declara como ilustrativa en la interfaz.
- **Nuevos incorporados: ninguno.** Licencias que los respaldarían: ver plan Z-Anatomy (CC BY-SA 4.0, excluyendo submodelos NC) en `ANATOMY-LICENSES.md`.

## 5. PayPal: qué está operativo

| Función | Estado |
|---|---|
| OAuth2 servidor a servidor con caché y reintento ante 401 | Implementado y probado contra un doble de la API |
| Crear suscripción (plan_id, custom_id, prueba con start_time, return/cancel URL, idempotencia) | Ídem |
| Consultar, cancelar, suspender, reactivar | Ídem + UI + E2E (proveedor demo) |
| Revisión de plan (solo a opción más económica) | API implementada y probada; sin botón en la UI |
| Transacciones e historial | Ídem + UI |
| Webhooks: verificación con bytes originales, idempotencia, orden, reintentos | Ídem |
| Control de acceso por plan confirmado y moneda | Ídem |
| Aprovisionamiento/verificación de planes (`npm run paypal:setup`) | Implementado; **no ejecutado** |
| **Sandbox y Live reales** | **No probados**: `api-m.sandbox.paypal.com` está bloqueado por la política de red de este entorno y no hay credenciales |

## 6. Pruebas ejecutadas y resultados

| Comando | Resultado |
|---|---|
| `npm run lint` | Sin errores ni avisos |
| `npm run typecheck` | Sin errores |
| `npm run test:unit` | 67/67 (antes 47) |
| `npm test` (build vinext/Workers + SSR + dominio) | 72/72 |
| `npm run build:next` | Correcto |
| `npx playwright test --workers=2` (escritorio + móvil, build de producción) | 32/32 |
| Impeccable `detect` (5 páginas) | 105 → 31 hallazgos; los de contraste restantes son falsos positivos documentados |

Nuevas pruebas: `tests/paypal.test.ts` (cliente, estados, OAuth, errores, checkout, plan/moneda no reconocidos, transiciones, verificación de webhooks, idempotencia, orden, reembolsos, eventos ajenos, reintentos), ampliaciones en `tests/billing.test.ts` (validación de entradas, pausa/reactivación, propiedad, revisión, transacciones, reconciliación, plan no contratable), `tests/config.test.ts` (configuración de PayPal), `tests/lod.test.ts` y E2E de pausa/reactivación/tema y de vistas/captura.

Observación: con 3 workers y render WebGL por software, algunas pruebas del visor quedaban cerca del límite de 45 s antes del LOD; con LOD1 bajaron a ~10 s.

## 7. Pendiente y por qué

| Pendiente | Motivo |
|---|---|
| Probar PayPal Sandbox de punta a punta y luego Live | Red bloqueada en este entorno; requiere credenciales del propietario |
| Confirmar licencia comercial de los modelos Tripo e ilustraciones | Depende de la cuenta que los generó |
| Catálogo segmentado (Z-Anatomy): esqueleto, músculos, nervios, vasos, sistemas completos; ocultar/aislar/opacidad por estructura; modo de identificación | Fase aparte decidida por el propietario; requiere pipeline de Blender y revisión anatómica |
| Plan Institucional (organizaciones, licencias, panel docente, CFDI) | No existía; se bloqueó la venta en lugar de simularlo |
| Colecciones, presentaciones, marcadores | No implementado en esta iteración |
| Hallazgos de diseño restantes (`icon-tile-stack`, viudas, tarjeta anidada del reto) y logo externo | Prioridad menor; listados en `UI-UX-AUDIT.md` |
| FPS y memoria GPU en dispositivos reales | Solo hay render por software en este entorno |

## 8. Antes del lanzamiento

1. Confirmar (o sustituir) la licencia de los modelos y de las ilustraciones.
2. PayPal Sandbox: `paypal:setup`, `--verify`, webhook registrado y la lista de escenarios de `PAYPAL-INTEGRATION.md`; después, lo mismo en Live.
3. Variables de producción: `DATABASE_URL`, `APP_URL`, `PAYPAL_*`, `RESEND_API_KEY`, `EMAIL_FROM`.
4. Revisión legal: términos, aviso de privacidad, aviso educativo (no sustituye consejo médico), facturación CFDI.
5. Alojar el logo de DevHive en `public/`.
6. Revisión del contenido clínico por un profesional.
7. Medir rendimiento en dispositivos reales.
