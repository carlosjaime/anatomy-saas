/**
 * Nivel de detalle: LOD1 (`/models/lod1/…`, 25 % de triángulos y texturas
 * 1024²; ver scripts/build-model-lods.mjs) en pantallas pequeñas, CPUs
 * modestas o con "Ahorro de datos"; LOD0 en el resto.
 */
export function modelUrlForDetail(url: string, lowDetail: boolean): string {
  return lowDetail && url.startsWith("/models/") && !url.startsWith("/models/lod1/") ? url.replace("/models/", "/models/lod1/") : url;
}
