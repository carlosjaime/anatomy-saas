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
- `npm run test:unit`: pruebas de dominio (planes, enciclopedia, cuentas, progreso, fisiología) contra SQLite en memoria
- `npm test`: build de vinext + pruebas de render SSR + pruebas de dominio
- `npm run build:next`: build de Vercel
