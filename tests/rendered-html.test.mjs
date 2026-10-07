import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the anatomy app shell in Spanish", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="es"/);
  assert.match(html, /<title>Atlas Anatómico/);
  assert.match(html, /Biblioteca de órganos/);
  assert.match(html, /aria-label="Navegación móvil"/);
  assert.match(html, /Enciclopedia/);
  // Pricing is in MXN; the old USD price must not leak into the markup.
  assert.doesNotMatch(html, /\$9\.99/);
});
