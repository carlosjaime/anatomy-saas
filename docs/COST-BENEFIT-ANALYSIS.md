# Análisis costo-beneficio

Estimaciones para decidir precios, no cotizaciones. Todo importe en MXN. Tipo de cambio supuesto: **18.5 MXN/USD**. Los precios de proveedores deben verificarse en sus páginas oficiales antes de presupuestar.

## 1. Comisión de PayPal

Supuesto (página de comisiones de PayPal México y calculadoras de terceros, **a verificar**): ventas nacionales **3.95 % + $4.00 MXN** por transacción, más **IVA 16 % sobre la comisión**. PayPal ofrece tarifas por volumen desde 3.65 % (≥ $50,000/mes) bajo solicitud.

El precio al público incluye IVA 16 %, que se entera al SAT: ingreso neto = precio / 1.16 − comisión.

| Plan y ciclo | Cobro | Sin IVA | Comisión PayPal | % del cobro | Neto | Neto por mes |
|---|---:|---:|---:|---:|---:|---:|
| Estudiante mensual | 129 | 111.21 | 10.55 | 8.2 % | 100.66 | 100.66 |
| Estudiante anual | 1,236 | 1,065.52 | 61.27 | 5.0 % | 1,004.24 | 83.69 |
| Profesional mensual | 249 | 214.66 | 16.05 | 6.4 % | 198.61 | 198.61 |
| Profesional anual | 2,388 | 2,058.62 | 114.06 | 4.8 % | 1,944.56 | 162.05 |

La parte fija ($4.64 con IVA) castiga los tickets chicos: en anual la comisión baja ~3 puntos.

## 2. Costos de operación

| Concepto | Supuesto | Mensual |
|---|---|---:|
| Hosting (Vercel Pro, 1 asiento) | USD 20, incluye 1 TB de transferencia | 370 |
| Base de datos (Turso) | Plan de pago de entrada ≈ USD 29 (el gratuito alcanza al inicio) | 0 – 540 |
| Correo transaccional (Resend) | Gratis hasta 3,000/mes; USD 20 después | 0 – 370 |
| Dominio | ≈ $400/año | 35 |
| Licencias de modelos | Z-Anatomy/BodyParts3D: $0 (CC). Tripo: derechos ya confirmados; solo hay costo si se generan modelos nuevos con un plan de pago | 0 – 400 |
| **Infraestructura** | | **≈ 400 – 1,700** |
| Mantenimiento de software | 0.25 de un desarrollador | 12,000 |
| Revisión de contenido médico | Anatomista/médico por horas | 5,000 |
| Soporte | Correo, primer nivel | 3,000 |
| **Total fijo (escenario base)** | | **≈ 21,700** |

### Modelos 3D: almacenamiento y transferencia

- Almacenamiento: LOD0 30.0 MB + LOD1 8.3 MB + ilustraciones: < 50 MB. Irrelevante en costo.
- Transferencia por usuario activo: una sesión típica carga 2–3 especímenes (≈ 2.5 MB en LOD1, ≈ 8 MB en LOD0) y el navegador los cachea. Estimado **50–150 MB/mes por usuario activo**.
- Con 1 TB incluido, Vercel cubre ≈ **7,000–20,000 usuarios activos/mes**. Por encima, a ≈ USD 0.15/GB, cuesta ≈ **$0.3 por usuario/mes**. Mover `public/models` a Cloudflare R2 (sin cargo por salida) elimina este costo si el tráfico crece.

Costo variable por usuario de pago (transferencia + BD + correo): **< $1/mes**.

## 3. Margen y punto de equilibrio

Mezcla supuesta de suscriptores: 60 % Estudiante, 40 % Profesional, mitad mensual y mitad anual.

- Neto medio Estudiante: (100.66 + 83.69) / 2 = **92.2**
- Neto medio Profesional: (198.61 + 162.05) / 2 = **180.3**
- **Neto mezclado por suscriptor: 0.6 × 92.2 + 0.4 × 180.3 ≈ $127/mes**
- Margen bruto sobre ingreso sin IVA (tras PayPal y variables): ≈ **90–94 %** según plan y ciclo.

| Escenario | Costo fijo | Suscriptores de pago para equilibrio |
|---|---:|---:|
| Solo infraestructura | 1,700 | **≈ 14** |
| Base (infra + mantenimiento + contenido + soporte) | 21,700 | **≈ 171** |
| Con un desarrollador de tiempo completo (≈ 45,000) | ≈ 54,700 | ≈ 431 |

Sensibilidad: si la mezcla fuera 80 % Estudiante anual, el neto medio caería a ≈ $103 y el equilibrio base subiría a ≈ 211.

## 4. Conclusiones

1. El costo marginal por usuario es casi nulo; el negocio depende de cubrir costos fijos de personas.
2. La comisión fija de PayPal hace que el **plan anual** sea el más rentable por peso cobrado: precios anuales redondos y visibles (propuesta en `SUBSCRIPTION-PLANS.md`).
3. El activo más caro y riesgoso no es la infraestructura sino el **contenido anatómico**: sustituir los modelos generados por IA por modelos CC (Z-Anatomy) cuesta horas de pipeline y revisión, no licencias.
4. El plan Institucional por licencia es la palanca de ingresos de mayor ticket, pero requiere desarrollo (gestión de grupos) antes de venderse.
