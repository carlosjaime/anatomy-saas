# Atlas Anatómico

Plataforma SaaS de anatomía clínica en 3D para estudiantes de medicina, residentes, médicos y docentes.

## Funcionalidades

- **Atlas 3D** (`/atlas`): especímenes interactivos con estructuras señaladas, corte, aislamiento, malla y comparación.
  - **Recorrido guiado**: la cámara enfoca cada estructura con su descripción (manual o autoplay).
  - **Fisiología animada**: latido a 72 lpm, respiración, sacadas oculares, peristalsis y perfusión.
  - **Guía de estudio** por órgano: objetivos de aprendizaje, puntos de alto rendimiento y perla clínica.
- **Enciclopedia** (`⌘K`): artículos con 7 secciones, búsqueda sin acentos, glosario A–Z y tarjetas de estudio.
- **Cuentas**: registro, inicio y cierre de sesión (`/registro`, `/login`), verificación de correo (`/verificar`) y
  recuperación de contraseña (`/recuperar`, `/restablecer`).
- **Suscripciones con Mercado Pago** (`/cuenta`): checkout alojado por Mercado Pago, 7 días de prueba gratis en la
  primera suscripción, cambio de plan sin cobros duplicados y cancelación con acceso hasta el fin del periodo pagado.
- **Panel de estudio** (`/dashboard`): dominio por órgano, precisión, racha, actividad de 14 días y recomendación.
- **Planes en MXN** con IVA incluido y facturación anual con descuento.
- **Bilingüe en tiempo real**: español (México) e inglés (EUA). El selector cambia todo —interfaz, contenido médico,
  validaciones, errores de la API, correos y metadatos— con un fundido de salida/entrada y sin perder el estado
  (órgano seleccionado, formularios, pestañas abiertas).
- **Micro-interacciones**: transiciones entre páginas, barra de progreso de navegación, toasts con temporizador,
  modales de confirmación, esqueletos de carga, ripple, contadores animados, confeti al activar un plan y animaciones
  de [Animate.css](https://animate.style) (subconjunto generado; respeta `prefers-reduced-motion`).

## Arquitectura

| Capa | Ubicación |
|---|---|
| Esquema Drizzle + migraciones versionadas | `db/schema.ts`, `db/migrations.ts` |
| Conexión (D1 en Cloudflare, libSQL en Node/Vercel) | `db/index.ts`, `db/runtime-env.ts` |
| Reglas de cuentas, sesiones y límite de intentos | `app/lib/server/auth-store.ts` |
| Progreso y métricas del panel | `app/lib/server/progress-store.ts` |
| Suscripciones (reglas, proveedor, webhook) | `app/lib/server/billing/*` |
| Correo transaccional y tokens de un solo uso | `app/lib/server/mailer.ts`, `email-tokens.ts` |
| Rutas API | `app/api/auth/*`, `app/api/billing/*`, `app/api/progress` |
| Validación compartida cliente/servidor | `app/lib/validation.ts` |
| Motor 3D, recorrido y fisiología | `app/lib/three/viewer.ts`, `app/lib/three/motion.ts` |
| Idiomas: configuración, diccionarios y proveedor | `app/i18n/*` |
| Contenido médico traducido (órganos, artículos, glosario) | `app/content/*` |
| UI transversal (toasts, modales, progreso, esqueletos) | `app/components/ui/*` |

**Idiomas**: el idioma vive en la cookie `atlas_locale` (o se negocia con `Accept-Language`). El servidor renderiza en
ese idioma y envía al cliente **solo** el diccionario y el contenido activos como props, así que el bundle JS no
incluye textos de ningún idioma. Al cambiarlo, el cliente funde la página, escribe la cookie y pide
`router.refresh()`: React reconcilia el árbol con los nuevos textos conservando el estado. Cualquier idioma nuevo debe
cumplir el tipo `Messages` de `app/i18n/messages/es-MX.ts`; una prueba verifica que ambos diccionarios tengan las
mismas claves y variables.

**Seguridad**: contraseñas con PBKDF2-SHA256 (100 000 iteraciones, sal aleatoria); sesiones con token opaco cuyo
SHA-256 se guarda en BD, en cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` en HTTPS) con vigencia de 30 días;
mutaciones solo JSON y del mismo origen (CSRF); bloqueo de 15 min tras 5 intentos fallidos por correo; mensajes de
error que no revelan si un correo existe; redirecciones post-login restringidas a rutas internas.

**Pagos**: el plan de un usuario nunca se guarda suelto; se deriva de sus suscripciones, cuyo estado solo cambia con
datos consultados a la API de Mercado Pago (webhook firmado con HMAC-SHA256 o sincronización al regresar del checkout).
La referencia externa `usuario:plan:ciclo` permite validar que cada suscripción pertenece a quien dice. Los datos de
tarjeta nunca pasan por la app.

## Configurar Mercado Pago

1. Crea una aplicación en el panel de desarrolladores de Mercado Pago y copia el *access token* (`TEST-…` para pruebas).
2. En **Webhooks**, registra `https://tu-dominio.mx/api/billing/webhook`, activa los eventos de suscripciones y copia la
   clave secreta en `MERCADOPAGO_WEBHOOK_SECRET`.
3. Define `APP_URL`, `RESEND_API_KEY` y `EMAIL_FROM` (dominio verificado en Resend).
4. Prueba el flujo completo con usuarios de prueba de Mercado Pago antes de usar credenciales de producción.

## Desarrollo

```bash
npm install
npm run dev:next     # Next.js en Node; usa file:.data/atlas.db sin configurar nada
npm run dev          # vinext/Cloudflare; usa el binding D1 local "DB"
```

## Despliegue

- **Vercel**: define `DATABASE_URL` (y `DATABASE_AUTH_TOKEN`) con una base libSQL, por ejemplo Turso. Sin ellas, la
  app funciona en modo invitado y las rutas de cuenta responden 503 con un mensaje claro.
- **Cloudflare / Sites**: `.openai/hosting.json` declara el binding D1 `DB`; el esquema se crea en el primer acceso.

Ver `.env.example`.

## Comandos

- `npm run lint` · `npm run typecheck`
- `npm run test:unit`: pruebas de dominio (planes, enciclopedia, cuentas, progreso, fisiología, idiomas) contra SQLite
  en memoria
- `npm test`: build de vinext + pruebas de render SSR + pruebas de dominio
- `npm run build:next`: build de Vercel
- `npm run test:e2e` (tras `build:next`) o `npm run test:e2e:full`: suite Playwright de extremo a extremo
- `npm run build:animations`: regenera `app/styles/animate-subset.css` desde `animate.css`

## Pruebas E2E

La suite (`e2e/`) corre contra el build de producción con `ATLAS_E2E=1`, que habilita el proveedor de pagos de
demostración y un buzón de correo en memoria (`/api/test/mailbox`) para leer los enlaces de verificación y
recuperación. Ese modo nunca se activa con `VERCEL_ENV=production` ni con credenciales reales, y fuera de él la ruta
del buzón responde 404. Cubre: cambio de idioma en vivo (fundido, persistencia, negociación, estado conservado),
registro con validación, verificación, inicio/cierre de sesión, recuperación de contraseña, prueba gratis, activación
y cancelación de suscripción, atlas, cuestionario, enciclopedia, tarjetas, 404 y ausencia de desbordes a 390 y 320 px.
Cualquier excepción o `console.error` en el navegador hace fallar la prueba.
