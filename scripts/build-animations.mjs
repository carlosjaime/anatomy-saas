// Genera app/styles/animate-subset.css: solo las animaciones de Animate.css que
// usa la app, con el prefijo oficial `animate__`, en lugar de cargar las ~100.
// Uso: npm run build:animations (vuelve a ejecutarlo al añadir una animación).
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const USED = {
  fading_entrances: ["fadeIn", "fadeInUp", "fadeInDown", "fadeInRight", "fadeInLeft"],
  fading_exits: ["fadeOut", "fadeOutRight", "fadeOutUp"],
  zooming_entrances: ["zoomIn"],
  bouncing_entrances: ["bounceIn"],
  back_entrances: ["backInUp"],
  attention_seekers: ["headShake", "heartBeat", "pulse", "tada", "rubberBand"],
  flippers: ["flipInX"],
  sliding_entrances: ["slideInUp"],
};

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve("animate.css/package.json")), "source");
// Prefija cada clase (`.fadeInUp` → `.animate__fadeInUp`); los @keyframes conservan su nombre, como en el build oficial.
const prefix = (css) => css.replace(/\.([a-z][\w-]*)(?=[\s,{.:[])/g, ".animate__$1");

const parts = [`/* Generado por scripts/build-animations.mjs desde animate.css ${require("animate.css/package.json").version} (MIT). No editar a mano. */`];
parts.push((await readFile(join(source, "_vars.css"), "utf8")).replace(/--(animate-)/g, "--$1"));
parts.push(prefix(await readFile(join(source, "_base.css"), "utf8")));
for (const [folder, names] of Object.entries(USED)) {
  for (const name of names) parts.push(prefix(await readFile(join(source, folder, `${name}.css`), "utf8")));
}
const output = parts.join("\n").replace(/\n{3,}/g, "\n\n");
await writeFile(new URL("../app/styles/animate-subset.css", import.meta.url), output);
console.log(`animate-subset.css: ${output.length} bytes, ${Object.values(USED).flat().length} animaciones`);
