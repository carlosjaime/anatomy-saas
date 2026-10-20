# Integración con PayPal Subscriptions

PayPal es el **único** procesador (decisión del propietario). Mercado Pago se retiró del código; las filas heredadas con `provider = 'mercadopago'` se leen pero no se sincronizan ni se administran (cancélalas en el panel de Mercado Pago).

## Arquitectura

```text
app/lib/server/billing/
├── provider.ts   Interfaz BillingProvider (reglas de negocio desacopladas del procesador)
├── paypal.ts     PayPalClient (OAuth2, idempotencia, errores) + PayPalProvider + verificación de webhooks
├── demo.ts       Proveedor de demostración (desarrollo y E2E; nunca en producción real)
├── service.ts    Reglas: checkout, sincronización, cancelar/pausar/reactivar/revisar, transacciones, resumen
├── webhooks.ts   Procesamiento idempotente de eventos verificados
├── entitlement.ts Plan efectivo derivado de suscripciones (sin cambios)
└── routes.ts     Utilidades HTTP: proveedor, URLs de retorno, rate limit, validación de ids
```

`service.ts` no importa nada de PayPal salvo para construir el proveedor en `getBillingProvider()`. Las pruebas de reglas usan un proveedor falso (`tests/support/fake-billing.ts`).

## Endpoints

| Método y ruta | Auth | Descripción |
|---|---|---|
| `GET /api/billing/plans` | Pública | Catálogo, importes por ciclo, moneda, IVA incluido, pagos habilitados |
| `GET /api/billing/subscriptions` | Sesión | Plan efectivo, prueba disponible, suscripción vigente/pausada/pendiente |
| `POST /api/billing/subscriptions` | Sesión + mismo origen | `{plan, cycle}` → crea la suscripción y devuelve `checkoutUrl` (aprobación en PayPal) |
| `GET /api/billing/subscriptions/{id}` | Sesión | Reconciliación contra PayPal (estado + transacciones) de una suscripción propia |
| `POST /api/billing/subscriptions/{id}/cancel` | Sesión + mismo origen | Cancela; conserva el acceso hasta el fin del periodo pagado |
| `POST /api/billing/subscriptions/{id}/suspend` | Sesión + mismo origen | Pausa cobros **y acceso** |
| `POST /api/billing/subscriptions/{id}/activate` | Sesión + mismo origen | Reactiva una suscripción pausada |
| `POST /api/billing/subscriptions/{id}/revise` | Sesión + mismo origen | `{plan, cycle}` → cambio a una opción **más económica**; devuelve `approvalUrl` |
| `GET /api/billing/history` | Sesión | Cobros, reembolsos y reversos del usuario |
| `POST /api/billing/webhooks/paypal` | Firma PayPal | Eventos de PayPal |

Mutaciones: JSON, mismo origen (defensa CSRF existente), 10 operaciones por usuario cada 10 min (`billing:<userId>` en `auth_attempts`), ids validados (`I-…` o `demo_…`) antes de tocar la API.

## Flujo de alta

1. `POST /api/billing/subscriptions` valida plan contratable (`selfServe`), ciclo y correo verificado; crea en PayPal con `plan_id`, `custom_id = usuario:plan:ciclo`, `start_time` diferido si aplica la prueba de 7 días, `return_url`/`cancel_url` y `PayPal-Request-Id`. Guarda la fila local como `pending`.
2. El usuario aprueba en PayPal y vuelve a `/cuenta?billing=return&subscription_id=I-…` (o a `billing=abandoned`).
3. **El redirect no es comprobante.** La página consulta la suscripción a PayPal (`reconcileSubscription`) y solo la aplica si `custom_id` pertenece al usuario en sesión.
4. El webhook `BILLING.SUBSCRIPTION.ACTIVATED` llega después (o antes): ambos caminos son idempotentes.

## Reglas de acceso

- Solo `ACTIVE` otorga plan, y únicamente si el `plan_id` está en `PAYPAL_PLAN_IDS` y el último cobro (si existe) es en MXN. Cualquier otra cosa se trata como `pending`.
- El plan local se toma del `plan_id` confirmado por PayPal (refleja revisiones aprobadas), no del `custom_id`.
- `SUSPENDED` → `paused` (sin acceso). `CANCELLED`/`EXPIRED` → `cancelled` con acceso hasta el siguiente cobro que ya no ocurrirá, si estaba vigente.
- Una nueva suscripción activada cancela en PayPal la anterior (sin cobros duplicados). Las **mejoras** de plan son suscripción nueva (cobro inmediato al nuevo precio); las **reducciones** usan `revise` (precio nuevo desde el siguiente ciclo). Así una revisión nunca da acceso superior pagando el precio anterior.
- La prueba gratis se consume solo cuando una suscripción con prueba se activa.

## Webhooks

Verificación: `POST /v1/notifications/verify-webhook-signature` con los encabezados `PAYPAL-TRANSMISSION-*`, `PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL` y `PAYPAL_WEBHOOK_ID`. El evento se reenvía **con sus bytes originales** (re-serializar el JSON rompe la firma). Antes de llamar a PayPal se rechazan localmente: encabezados faltantes, `cert_url` fuera de `*.paypal.com` por HTTPS, transmisión con más de 24 h de diferencia y cuerpo no JSON. Cuerpo máximo 256 KB.

| Evento | Efecto |
|---|---|
| `BILLING.SUBSCRIPTION.CREATED`, `ACTIVATED`, `UPDATED`, `RE-ACTIVATED`, `CANCELLED`, `SUSPENDED`, `EXPIRED`, `PAYMENT.FAILED` | Reconsulta la suscripción a PayPal y aplica su estado **actual** |
| `PAYMENT.SALE.COMPLETED` | Sincroniza la suscripción (`billing_agreement_id`) y registra el cobro |
| `PAYMENT.SALE.REFUNDED` | Registra el reembolso enlazado a la venta (`sale_id`) |
| `PAYMENT.SALE.REVERSED` | Registra el reverso y lo deja en el log para revisión manual |
| Otros | Se registran como `ignored` |

- **Idempotencia:** `webhook_events.id` = id del evento. Uno `processed`/`ignored` responde `duplicate`; uno `failed` se reprocesa e incrementa `attempts`.
- **Orden:** como el estado siempre se reconsulta, un evento viejo no puede revertir uno nuevo.
- **Carreras:** sincronización y transacciones son upserts por id.
- **Reintentos:** un error de procesamiento responde 500 y PayPal reintenta.

Reembolsos y reversos **no** revocan acceso automáticamente: PayPal suspende/cancela la suscripción cuando corresponde y ese cambio llega por su propio evento. Un contracargo requiere decisión humana.

## Base de datos (migración v3)

- `billing_transactions` (id del procesador PK, suscripción, usuario FK, `kind` payment/refund/reversal con CHECK, estado, `amount_cents ≥ 0`, moneda, `flagged`, `related_id`, fechas). Índices por usuario/fecha y por suscripción. `flagged = 1` si la moneda no es MXN o el importe no corresponde a ningún plan.
- `webhook_events` (id del evento PK, tipo, recurso, estado, intentos, error, fechas). Índice por recurso.
- Índice `subscriptions (user_id, status)`.
- No se guardan datos de tarjeta ni del medio de pago.

Planes y derechos (`SubscriptionPlans`, `FeatureEntitlements`) viven en código (`app/lib/plans.ts`) como fuente única: precios y capacidades se prueban en aislamiento y `npm run paypal:setup` crea los planes de PayPal a partir de ese archivo, evitando que la BD y PayPal diverjan.

## Configuración

```bash
PAYPAL_CLIENT_ID=            # solo servidor
PAYPAL_CLIENT_SECRET=        # solo servidor
PAYPAL_ENVIRONMENT=sandbox   # o live; cualquier otro valor desactiva pagos
PAYPAL_WEBHOOK_ID=           # sin él, el webhook responde 503
PAYPAL_PLAN_IDS='{"student:monthly":"P-…","student:annual":"P-…","pro:monthly":"P-…","pro:annual":"P-…"}'
```

El checkout es por redirección a PayPal: **no se usa el SDK de JavaScript ni se expone el Client ID al navegador.**

### Puesta en marcha (sandbox)

1. developer.paypal.com → Apps & Credentials (Sandbox) → crear app; copiar Client ID y Secret.
2. `PAYPAL_CLIENT_ID=… PAYPAL_CLIENT_SECRET=… npm run paypal:setup` → crea el producto `ATLAS-ANATOMICO` y los planes (MXN, IVA 16 % incluido, `payment_failure_threshold: 2`) e imprime `PAYPAL_PLAN_IDS`.
3. `npm run paypal:setup -- --verify` comprueba precio, moneda, periodicidad y estado de cada plan contra `app/lib/plans.ts`.
4. Registrar el webhook `https://<dominio>/api/billing/webhooks/paypal` con los eventos de la tabla; copiar su id en `PAYPAL_WEBHOOK_ID`.
5. Probar con cuentas personales de sandbox: alta con prueba, alta sin prueba, abandono, pausa, reactivación, cancelación, reducción de plan, cobro fallido (tarjeta de prueba que rechaza), reembolso desde el panel.
6. Repetir los pasos 1–4 en Live con `PAYPAL_ENVIRONMENT=live` solo después de completar el paso 5.

## Estado y verificación

| Función | Estado |
|---|---|
| OAuth2, crear, consultar, cancelar, suspender, reactivar, revisar, transacciones | Implementado; probado con un doble de la API (`tests/paypal.test.ts`) |
| Verificación de webhooks, idempotencia, orden, reembolsos | Implementado; probado con el doble de la API |
| UI: alta, retorno, pausa/reactivación, cancelación, historial | Implementado; E2E con el proveedor de demostración |
| Revisión (reducción de plan) en la UI | API lista; **sin botón** hasta validarla en sandbox |
| **Prueba contra PayPal Sandbox real** | **Pendiente:** `api-m.sandbox.paypal.com` está bloqueado por la red de este entorno y no hay credenciales. Ninguna llamada real se ha hecho todavía. |

Puntos a confirmar en sandbox: que `start_time` futuro difiere el primer cobro como se espera; el contenido real de `PAYMENT.SALE.REVERSED`; el comportamiento de `revise` (momento en que cambia `plan_id`).
