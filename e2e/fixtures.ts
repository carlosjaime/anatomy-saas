import { readFileSync } from "node:fs";
import { expect, test as base } from "@playwright/test";
import { DEVELOPER } from "../app/lib/brand";

// Las pruebas no dependen de la red externa: el logotipo remoto se sirve local.
const LOGO_STUB = readFileSync(new URL("../public/icon-192.png", import.meta.url));

/**
 * `test` con una verificación automática: cualquier excepción no capturada o
 * `console.error` en el navegador hace fallar la prueba. Se ignoran solo los
 * avisos del propio navegador por respuestas HTTP de error esperadas
 * (p. ej. 401 al probar una contraseña incorrecta o 404 en la página 404).
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      await page.route(DEVELOPER.logoUrl, (route) => route.fulfill({ status: 200, contentType: "image/png", body: LOGO_STUB }));
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (/Failed to load resource: the server responded with a status of (401|403|404|409|422|429)/.test(text)) return;
        problems.push(`console.error: ${text}`);
      });
      await use();
      expect(problems, "errores en el navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
