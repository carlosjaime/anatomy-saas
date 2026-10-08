import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import en from "../app/i18n/messages/en-US";
import { register, switchLocale, uniqueEmail } from "./helpers";

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label} se desborda ${overflow}px`).toBeLessThanOrEqual(1);
  // Un contenedor con overflow oculto no genera scroll pero puede recortar
  // controles: el selector de idioma siempre debe quedar entero en pantalla.
  const width = page.viewportSize()!.width;
  for (const trigger of await page.getByTestId("language-switcher").all()) {
    if (!(await trigger.isVisible())) continue;
    const box = (await trigger.boundingBox())!;
    expect(box.x, `${label}: selector de idioma recortado`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${label}: selector de idioma recortado`).toBeLessThanOrEqual(width + 1);
  }
}

test.describe("responsive móvil", () => {
  for (const width of [390, 320]) {
    test(`sin desbordes horizontales a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/", "/acerca", "/juego", "/atlas", "/login", "/registro", "/recuperar", "/no-existe"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page, path);
      }
      await register(page, { email: uniqueEmail(`m${width}`) });
      for (const path of ["/dashboard", "/cuenta"]) {
        await page.goto(path);
        await expectNoHorizontalOverflow(page, path);
      }
    });
  }

  test("el selector de idioma y los toasts funcionan en móvil", async ({ page }) => {
    await page.goto("/atlas");
    await switchLocale(page, "en-US");
    await expect(page.getByRole("status").filter({ hasText: en.language.changed })).toBeVisible();
    const box = (await page.locator(".toast-region").boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    await expectNoHorizontalOverflow(page, "/atlas en inglés");
  });
});

test("el reto anatómico funciona con toque en móvil", async ({ page }) => {
  await page.goto("/juego");
  await page.getByTestId("game-start").click();
  // Tocar un órgano lo selecciona; tocar el cuerpo lo coloca en ese punto.
  await page.getByTestId("tray-brain").tap();
  // Como haría el usuario: con la figura a la vista (seleccionar puede desplazar la página).
  await page.getByTestId("game-stage").evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  const stage = (await page.getByTestId("game-stage").boundingBox())!;
  await page.touchscreen.tap(stage.x + stage.width / 2, stage.y + (62 / 720) * stage.height);
  await expect(page.getByTestId("placed-brain")).toHaveAttribute("data-result", "correct");
  await expectNoHorizontalOverflow(page, "/juego en partida");
});
