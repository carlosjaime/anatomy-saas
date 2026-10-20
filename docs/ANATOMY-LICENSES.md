# Licencias de recursos anatómicos

> Este documento no es asesoría legal. Las conclusiones son técnicas y deben confirmarse con un abogado antes del lanzamiento comercial.

## Recursos en uso

| Recurso | Ruta | Origen | Licencia | Estado |
|---|---|---|---|---|
| 9 especímenes GLB | `public/models/*.glb` | Generados con **Tripo** (metadatos `tripo_node_*`, `tripo_material_*`), optimizados con glTF-Transform 4.4.2 | **Desconocida** | ⚠️ **Bloqueante para lanzamiento** |
| 9 especímenes LOD1 | `public/models/lod1/*.glb` | Derivados de los anteriores con `scripts/build-model-lods.mjs` | Hereda la de los originales | ⚠️ Igual que arriba |
| Ilustraciones por órgano | `public/anatomy/<órgano>/*.webp` | Sin registro de procedencia en el repositorio | **Desconocida** | ⚠️ Verificar |
| Decodificadores Draco/Basis | `public/draco`, `public/basis` | Google Draco / Binomial Basis Universal | Apache 2.0 | ✅ |

### Tripo: por qué es bloqueante

Las fuentes públicas se contradicen sobre los modelos del plan gratuito: artículos del blog de Tripo los describen como CC BY 4.0 (uso comercial con atribución), mientras que su página de ayuda "How to Use Tripo Models Commercially" indica que, según los Términos (sección 5.2.1), Tripo conserva los derechos de las salidas de usuarios gratuitos y **no** concede uso comercial. Los planes de pago sí conceden derechos comerciales.

**Acción requerida:** confirmar con la cuenta que generó los modelos que se crearon con un **plan de pago** vigente en ese momento y conservar la evidencia (factura, fecha, términos). Si no se puede demostrar, retirar los modelos o regenerarlos/sustituirlos antes de cobrar.

Aun con derechos comerciales, son modelos ilustrativos generados por IA: la app lo declara en el visor y no los presenta como anatomía validada.

## Fuentes evaluadas para ampliar el catálogo

| Fuente | Licencia verificada | Uso comercial | Obligaciones | Decisión |
|---|---|---|---|---|
| **Z-Anatomy** (`github.com/Z-Anatomy/Models-of-human-anatomy`) | CC BY-SA 4.0 (`License.txt` y `Readme.md` del repositorio, leídos directamente) | Sí | Atribución: "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0" y "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan". **ShareAlike:** los modelos derivados deben publicarse bajo la misma licencia (aplica a los modelos, no al código de la app). | ✅ Candidata principal (fase aparte) |
| Z-Anatomy · "Anatomy of the Inner Ear" (U. de Dundee) | CC BY-NC-SA 4.0 | **No** | — | ❌ Excluir |
| Z-Anatomy · "Kidney" (Lissie Cowley) | CC BY-NC 4.0 | **No** | — | ❌ Excluir |
| Z-Anatomy · "Cranial Nerves and Foramina" (U. de Dundee, CAHID) | CC BY 4.0 | Sí | Atribución | ✅ |
| Z-Anatomy · definiciones (Wikipedia) | CC BY-SA 3.0 | Sí | Atribución + ShareAlike; traducción automática con posibles errores | ⚠️ No usar como contenido clínico sin revisión |
| **BodyParts3D** (DBCLS) | Página oficial actual: CC BY 4.0 (actualizada 2025-02-27). Versiones 2009–2011: CC BY-SA 2.1 Japón | Sí | Atribución "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"; si se usa una versión antigua, rige su licencia (ShareAlike) | ✅ Alternativa; host bloqueado en este entorno |

### Cumplimiento de ShareAlike (si se adopta Z-Anatomy)

1. Publicar los GLB derivados (y sus fuentes intermedias) bajo CC BY-SA 4.0, por ejemplo en un repositorio público de assets.
2. Página de créditos accesible desde el visor y el pie de página con las atribuciones exactas de arriba.
3. Registro de modificaciones por modelo: simplificación, recorte, retopología, recoloreado, conversión de formato.
4. Los modelos servidos a usuarios de pago siguen siendo CC BY-SA: el valor comercial está en la plataforma (visor, contenido clínico propio, cuestionarios), no en la exclusividad de las mallas.

## Registro de modificaciones

| Fecha | Recurso | Cambio |
|---|---|---|
| 2026-10-20 | `public/models/lod1/*` | Generados desde los GLB originales: weld, simplify 25 % (error 0.0005), texturas a 1024², meshopt. Deriva de caja envolvente ≤ 0.07 %. |
