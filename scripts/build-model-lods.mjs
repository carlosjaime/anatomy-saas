/**
 * Genera el nivel de detalle ligero (LOD1) de cada espécimen para móviles y
 * equipos de bajo consumo: 25 % de los triángulos y texturas a 1024².
 *
 *   npm run models:lod
 *
 * Pipeline (glTF-Transform, versión fijada): weld → simplify → resize →
 * meshopt. Verifica que la caja envolvente no cambie más de 1 %, porque los
 * puntos señalados se expresan en el espacio normalizado del modelo.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = ["-y", "@gltf-transform/cli@4.2.1"];
const SOURCE = "public/models";
const TARGET = "public/models/lod1";
const RATIO = "0.25";
const ERROR = "0.0005";
const TEXTURE = "1024";
const MAX_BBOX_DRIFT = 0.01;

function gltf(...args) {
  execFileSync("npx", [...CLI, ...args], { stdio: ["ignore", "ignore", "inherit"] });
}

/** Lee el JSON de un GLB y calcula triángulos y caja envolvente en espacio de escena. */
export function describe(path) {
  const data = readFileSync(path);
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString("utf8"));
  let triangles = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const node of json.nodes ?? []) {
    if (node.mesh === undefined) continue;
    const scale = node.scale ?? [1, 1, 1];
    const translation = node.translation ?? [0, 0, 0];
    for (const primitive of json.meshes[node.mesh].primitives) {
      if (primitive.indices !== undefined) triangles += json.accessors[primitive.indices].count / 3;
      const position = json.accessors[primitive.attributes.POSITION];
      for (let axis = 0; axis < 3; axis += 1) {
        // Con KHR_mesh_quantization los límites pueden estar normalizados.
        const unit = position.normalized ? (position.componentType === 5122 ? 32767 : position.componentType === 5120 ? 127 : 1) : 1;
        min[axis] = Math.min(min[axis], translation[axis] + (scale[axis] * position.min[axis]) / unit);
        max[axis] = Math.max(max[axis], translation[axis] + (scale[axis] * position.max[axis]) / unit);
      }
    }
  }
  const textures = (json.images ?? []).length;
  return { triangles: Math.round(triangles), min, max, textures, bytes: statSync(path).size };
}

function drift(a, b) {
  const size = Math.max(...a.max.map((value, i) => value - a.min[i]));
  return Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(a.min[i] - b.min[i]), Math.abs(a.max[i] - b.max[i])])) / size;
}

mkdirSync(TARGET, { recursive: true });
const report = [];
let failed = false;
for (const file of readdirSync(SOURCE).filter((name) => name.endsWith(".glb")).sort()) {
  const work = mkdtempSync(join(tmpdir(), "lod-"));
  const source = join(SOURCE, file);
  const output = join(TARGET, file);
  gltf("weld", source, join(work, "a.glb"));
  gltf("simplify", join(work, "a.glb"), join(work, "b.glb"), "--ratio", RATIO, "--error", ERROR);
  gltf("resize", join(work, "b.glb"), join(work, "c.glb"), "--width", TEXTURE, "--height", TEXTURE);
  gltf("meshopt", join(work, "c.glb"), output);
  rmSync(work, { recursive: true, force: true });

  const before = describe(source);
  const after = describe(output);
  const bboxDrift = drift(before, after);
  failed ||= bboxDrift > MAX_BBOX_DRIFT;
  report.push({
    model: file.replace(".glb", ""),
    lod0: { triangles: before.triangles, bytes: before.bytes },
    lod1: { triangles: after.triangles, bytes: after.bytes },
    bboxDrift: Number(bboxDrift.toFixed(5)),
  });
  console.log(`${bboxDrift > MAX_BBOX_DRIFT ? "✗" : "✓"} ${file}: ${before.triangles} → ${after.triangles} tris, ${(before.bytes / 1e6).toFixed(2)} → ${(after.bytes / 1e6).toFixed(2)} MB, bbox drift ${(bboxDrift * 100).toFixed(3)} %`);
}
writeFileSync(join(TARGET, "report.json"), `${JSON.stringify({ ratio: Number(RATIO), texture: Number(TEXTURE), models: report }, null, 2)}\n`);
process.exit(failed ? 1 : 0);
