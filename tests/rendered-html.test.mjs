import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the landing page in Spanish", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="es"/);
  assert.match(html, /<title>Atlas Anatómico/);
  assert.match(html, /práctica médica/);
  assert.match(html, /href="\/registro"/);
  assert.match(html, /MXN/);
  assert.doesNotMatch(html, /\$9\.99/);
});

test("server-renders the atlas for guests", async () => {
  const html = await (await render("/atlas?organ=liver")).text();
  assert.match(html, /Biblioteca de órganos/);
  assert.match(html, /Objetivos de aprendizaje/);
  assert.match(html, /Hígado/);
});

test("auth pages render and the dashboard requires a session", async () => {
  assert.match(await (await render("/login")).text(), /Iniciar sesión/);
  assert.match(await (await render("/registro")).text(), /Crea tu cuenta/);
  const dashboard = await render("/dashboard");
  assert.ok([302, 303, 307, 308].includes(dashboard.status), `expected redirect, got ${dashboard.status}`);
  assert.match(dashboard.headers.get("location") ?? "", /\/login\?next=%2Fdashboard/);
});
