# Atlas Anatómico

Plataforma SaaS de anatomía clínica en 3D para estudiantes de medicina, residentes, médicos y docentes.

## Funcionalidades

- **Atlas 3D** (`/atlas`): especímenes interactivos con estructuras señaladas, corte, aislamiento, malla y comparación.
  - **Recorrido guiado**: la cámara enfoca cada estructura con su descripción (manual o autoplay).
  - **Fisiología animada**: latido a 72 lpm, respiración, sacadas oculares, peristalsis y perfusión.
  - **Guía de estudio** por órgano: objetivos de aprendizaje, puntos de alto rendimiento y perla clínica.
- **Enciclopedia** (`⌘K`): artículos con 7 secciones, búsqueda sin acentos, glosario A–Z y tarjetas de estudio.
- **Cuentas**: registro, inicio y cierre de sesión (`/registro`, `/login`).
- **Panel de estudio** (`/dashboard`): dominio por órgano, precisión, racha, actividad de 14 días y recomendación.
- **Planes en MXN** con IVA incluido y facturación anual con descuento (cambio de plan de demostración, sin pagos).

## Arquitectura

| Capa | Ubicación |
|---|---|
| Esquema Drizzle + DDL idempotente | `db/schema.ts`, `db/bootstrap.ts` |
| Conexión (D1 en Cloudflare, libSQL en Node/Vercel) | `db/index.ts`, `db/runtime-env.ts` |
| Reglas de cuentas, sesiones y límite de intentos | `app/lib/server/auth-store.ts` |
| Progreso y métricas del panel | `app/lib/server/progress-store.ts` |
| Rutas API | `app/api/auth/*`, `app/api/progress`, `app/api/account/plan` |
| Validación compartida cliente/servidor | `app/lib/validation.ts` |
| Motor 3D, recorrido y fisiología | `app/lib/three/viewer.ts`, `app/lib/three/motion.ts` |

**Seguridad**: contraseñas con PBKDF2-SHA256 (100 000 iteraciones, sal aleatoria); sesiones con token opaco cuyo
SHA-256 se guarda en BD, en cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` en HTTPS) con vigencia de 30 días;
mutaciones solo JSON y del mismo origen (CSRF); bloqueo de 15 min tras 5 intentos fallidos por correo; mensajes de
error que no revelan si un correo existe; redirecciones post-login restringidas a rutas internas.

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
