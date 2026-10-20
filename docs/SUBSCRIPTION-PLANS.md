# Planes de suscripción

Fuente de verdad: `app/lib/plans.ts`. Precios en MXN con IVA incluido. Cobro recurrente con PayPal; 7 días de prueba en la primera suscripción de cada cuenta.

## Planes vigentes en el código

| | **Gratis** | **Estudiante** | **Profesional** | **Institucional** |
|---|---|---|---|---|
| Mensual | $0 | $129 | $249 | — |
| Anual (−20 %) | $0 | $1,236 ($103/mes) | $2,388 ($199/mes) | — |
| Contratable en línea | — | Sí | Sí | **No (próximamente)** |
| Visor 3D de los 9 especímenes | ✅ | ✅ | ✅ | ✅ |
| Vistas anatómicas, captura, LOD móvil | ✅ | ✅ | ✅ | ✅ |
| Ficha clínica | 4 órganos | 9 órganos | 9 órganos | 9 órganos |
| Enciclopedia completa (anatomía, histología, embriología) | Parcial | ✅ | ✅ | ✅ |
| Correlación clínica (semiología, estudios, abordaje) | — | — | ✅ | ✅ |
| Tarjetas de estudio y cuestionarios | Órganos gratuitos | Todos | Todos | Todos |
| Reto anatómico y panel de estudio | ✅ | ✅ | ✅ | ✅ |
| Licencias por grupo | — | — | — | Planeado (25) |

Capacidades en código: `allOrgans`, `fullEncyclopedia`, `allFlashcards`, `clinicalCorrelation`. El acceso se calcula en servidor a partir de las suscripciones confirmadas por PayPal (`entitlement.ts`).

### Reglas visibles para el usuario (Mi cuenta)

- Moneda MXN, periodicidad mensual o anual, renovación automática, fecha del primer/próximo cobro.
- Cancelación en cualquier momento; el acceso se conserva hasta el fin del periodo pagado.
- Pausa: sin cobros y sin acceso de pago hasta reactivar.
- Mejora de plan: nueva suscripción con cobro inmediato; la anterior se cancela al activarse la nueva.
- Historial de cobros, reembolsos y reversos con la referencia de PayPal.

### Por qué Institucional no se vende todavía

El plan anunciaba 25 licencias, pero no existe gestión de grupos: una compra habría otorgado una sola licencia. Se marcó como "Próximamente" y se bloqueó en servidor (`selfServe: false`). Requisitos para habilitarlo: organizaciones, invitaciones por correo/dominio, asignación y revocación de licencias, panel docente, suscripción PayPal con `quantity` por licencia y facturación (CFDI).

## Propuesta comercial (no aprobada)

Basada en `COST-BENEFIT-ANALYSIS.md`. Cambiar precios exige crear planes nuevos en PayPal (`npm run paypal:setup` los crea con otra clave de idempotencia porque incluye el importe).

| Plan | Mensual | Anual | Justificación |
|---|---|---|---|
| Gratis | $0 | — | Adquisición: visor completo + 4 fichas. |
| Estudiante | **$129** (sin cambio) | **$1,190** (≈ −23 %) | Precio redondo; la comisión fija de PayPal pesa 8.2 % en mensual y 5.0 % en anual: conviene empujar el anual. |
| Profesional | **$249** (sin cambio) | **$2,290** (≈ −23 %) | Mismo razonamiento; margen holgado. |
| Institucional | — | **$59 por licencia/mes, facturado anual, mínimo 10** | Cuando exista gestión de licencias. A 25 licencias = $17,700/año, frente a $19,188/año del precio anual de referencia actual ($1,999 × 0.8 × 12); competitivo para facultades. |

## Perfiles

- **Estudiante:** plan Estudiante; cuestionarios, tarjetas, reto y panel de progreso.
- **Profesional sanitario:** plan Profesional; correlación clínica, vistas anatómicas y captura para explicar a pacientes.
- **Docente/institución:** hoy, licencias individuales Profesional; mañana, plan Institucional.
