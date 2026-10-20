# Modelos anatómicos 3D

## Inventario actual

Nueve especímenes en `public/models/*.glb` (LOD0) y `public/models/lod1/*.glb` (LOD1). Datos medidos con glTF-Transform 4.2.1 (`public/models/lod1/report.json`).

| Espécimen | Triángulos LOD0 → LOD1 | Tamaño LOD0 → LOD1 | Texturas LOD0 | Deriva de caja envolvente LOD1 |
|---|---|---|---|---|
| Cerebro | 377 692 → 94 421 | 2.57 → 0.79 MB | 3 × 2048² | 0.021 % |
| Ojo | 320 250 → 80 062 | 2.20 → 0.69 MB | 3 × 2048² | 0.006 % |
| Corazón | 386 597 → 96 634 | 3.32 → 0.80 MB | 3 × 2048² | 0.024 % |
| Intestino | 308 748 → 77 187 | 1.98 → 0.61 MB | 1 × 2048² | 0.037 % |
| Riñones | 327 452 → 81 862 | 2.19 → 0.65 MB | 3 × 2048² | 0.006 % |
| Hígado | 345 526 → 109 551 | 2.66 → 1.01 MB | 1 × 2048² | 0.037 % |
| Pulmones | 350 772 → 87 692 | 4.46 → 0.89 MB | 3 × 2048² | 0.014 % |
| Páncreas | 346 596 → 86 648 | 4.85 → 1.03 MB | 3 × 2048² | 0.014 % |
| Piel | 356 333 → 175 575 | 5.79 → 1.78 MB | 3 × 2048² | 0.070 % |
| **Total** | **3 119 966 → 889 632** | **30.0 → 8.3 MB** | | |

VRAM estimada por espécimen (corazón): ~67 MB de texturas en LOD0 → ~17 MB en LOD1.

## Diagnóstico

| Aspecto | Hallazgo | Severidad |
|---|---|---|
| Procedencia | Los nueve GLB tienen nodos y materiales `tripo_*`: son **mallas generadas por IA con Tripo**. El propietario confirmó los derechos comerciales el 2026-10-20 (ver `ANATOMY-LICENSES.md`). | Resuelta |
| Precisión anatómica | Generadas a partir de una imagen/texto, no de datos anatómicos (TC/RM o atlas segmentado). La forma general es verosímil, pero **no hay garantía de exactitud** de cámaras, válvulas, ramas vasculares, lóbulos ni proporciones. | **Alta** |
| Segmentación | Una sola malla y un solo material por espécimen. No se pueden ocultar, aislar, resaltar ni consultar estructuras individuales; "Aislar" y "Corte" actúan sobre el órgano completo. | **Alta** (limita el explorador) |
| Etiquetado | Los puntos señalados (`hotspots` en `app/lib/anatomy-data.ts`) son coordenadas colocadas a mano en el espacio normalizado; no están ligados a geometría anatómica. | Media |
| Materiales | PBR (baseColor + normal + metallicRoughness), `KHR_materials_volume` en 7 de 9. El cargador normaliza rugosidad (0.42–0.62), metalicidad 0 y atenúa normales: correcto para tejido. | Baja |
| Rendimiento | 300–390 k triángulos y texturas 2048² por órgano: excesivo para móviles. **Resuelto con LOD1.** | Media → resuelta |
| Cobertura | 9 órganos aislados. No hay esqueleto, musculatura, vasos periféricos, nervios ni sistemas completos. | Alta (producto) |

## Mejoras aplicadas

1. **LOD1** (`npm run models:lod`): weld → simplify al 25 % (error 0.0005) → texturas 1024² → meshopt. El script falla si la caja envolvente se desplaza > 1 %, para que los puntos señalados sigan siendo válidos.
2. **Selección de detalle** (`app/lib/three/lod.ts`): LOD1 en pantallas ≤ 780 px, CPU < 6 núcleos o "Ahorro de datos"; si falta el LOD1 se carga el LOD0.
3. **Vistas anatómicas** anterior, lateral izquierda, posterior y lateral derecha, y **captura PNG** del espécimen.
4. **Aviso de modelo ilustrativo** en el panel de información: "Modelo ilustrativo de forma general; las estructuras señaladas son referencias aproximadas."
5. Pedestal sincronizado con el tema claro/oscuro.

## Rendimiento medido

Medición en este entorno (Chromium headless con SwiftShader, render por CPU, contenedor < 6 núcleos → LOD1). No se reportan FPS: con render por software no son representativos de un dispositivo real.

- Suite E2E del atlas (6 pruebas, 1 worker): las dos pruebas que cargan el visor pasaron de **~40 s** (LOD0, al borde del límite de 45 s) a **~10–11 s** con LOD1.
- Descarga de los nueve especímenes: 30.0 MB → 8.3 MB.

Pendiente: medir FPS y memoria GPU en dispositivos reales (iPhone de gama media, Android de gama baja, laptop con GPU integrada) con `renderer.info` y el panel de rendimiento.

## Nuevos modelos incorporados

**Ninguno.** No se incorporaron modelos en esta iteración (decisión del propietario: documentar y optimizar; Z-Anatomy en una fase aparte). Este entorno no tiene acceso de red a BodyParts3D; Z-Anatomy sí es accesible por git.

## Plan para un catálogo anatómicamente fiable

1. **Fuente:** Z-Anatomy (`Z-Anatomy/Models-of-human-anatomy`, plantilla de Blender, CC BY-SA 4.0), derivada de BodyParts3D. Ofrece estructuras **segmentadas y nombradas** con Terminologia Anatomica (`TA2.csv` en el repositorio).
2. **Exclusiones obligatorias:** los submodelos con licencia no comercial ("Anatomy of the Inner Ear" CC BY-NC-SA 4.0 y "Kidney" CC BY-NC 4.0) **no se pueden usar** en un producto de pago.
3. **Pipeline:** Blender (headless) → exportar por sistema y por estructura a glTF con nombres TA → glTF-Transform (dedup, weld, simplify por LOD, meshopt/Draco, KTX2) → manifiesto JSON (id TA, nombre es/en/latín, sistema, archivo, licencia).
4. **Explorador:** con estructuras separadas se habilitan ocultar/mostrar, aislar, opacidad por capa, búsqueda que encuadra la estructura y cuestionarios de identificación.
5. **Validación:** revisión por un anatomista de cada estructura antes de publicarla; registro de cambios por modelo en `ANATOMY-LICENSES.md`.
6. **Sustitución de los modelos Tripo:** su licencia está confirmada, así que no es urgente. Se reemplazan cuando exista el equivalente Z-Anatomy segmentado y revisado de cada órgano, por precisión y para habilitar herramientas por estructura.
