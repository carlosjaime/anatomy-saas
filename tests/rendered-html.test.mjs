import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", ...headers } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the landing page in Spanish", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="es-MX"/);
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
  assert.match(await (await render("/recuperar")).text(), /Recupera tu acceso/);
  assert.match(await (await render("/restablecer?token=x")).text(), /Crea una nueva contraseña/);
  const account = await render("/cuenta");
  assert.ok([302, 303, 307, 308].includes(account.status), `expected redirect, got ${account.status}`);
  const dashboard = await render("/dashboard");
  assert.ok([302, 303, 307, 308].includes(dashboard.status), `expected redirect, got ${dashboard.status}`);
  assert.match(dashboard.headers.get("location") ?? "", /\/login\?next=%2Fdashboard/);
});

test("server-renders English from the locale cookie or Accept-Language", async () => {
  const fromCookie = await (await render("/atlas?organ=liver", { cookie: "atlas_locale=en-US", "accept-language": "es-MX" })).text();
  assert.match(fromCookie, /<html lang="en-US"/);
  assert.match(fromCookie, /Organ library/);
  assert.match(fromCookie, /Liver/);
  assert.doesNotMatch(fromCookie, /Biblioteca de órganos/);

  const negotiated = await (await render("/login", { "accept-language": "en-GB,en;q=0.9" })).text();
  assert.match(negotiated, /<html lang="en-US"/);
  assert.match(negotiated, /Welcome back/);
});
