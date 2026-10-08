import { expect, test } from "./fixtures";
import es from "../app/i18n/messages/es-MX";
import en from "../app/i18n/messages/en-US";
import { switchLocale } from "./helpers";

test.describe("pie de página y Acerca de", () => {
  test("el footer completo muestra a DevHive y enlaza a Acerca de", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo", { name: es.footer.label });
    await expect(footer.getByAltText(es.footer.devhiveAlt)).toBeVisible();
    await expect(footer).toContainText(`© 2026 DevHive Software · ${es.footer.rights}`);
    await footer.getByRole("link", { name: es.footer.about }).click();
    await expect(page).toHaveURL(/\/acerca$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.about.title);
  });

  test("Acerca de está localizada y muestra el crédito de desarrollo", async ({ page }) => {
    await page.goto("/acerca");
    await expect(page).toHaveTitle(es.meta.about);
    await expect(page.getByRole("heading", { name: es.about.builtByTitle })).toBeVisible();
    await switchLocale(page, "en-US");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.about.title);
    await expect(page.getByText(`© 2026 DevHive Software · ${en.footer.rights}`)).toBeVisible();
  });

  test("las áreas de trabajo muestran el footer compacto", async ({ page }) => {
    for (const path of ["/atlas", "/login"]) {
      await page.goto(path);
      const footer = page.locator(".site-footer.compact");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer.getByAltText(es.footer.devhiveAlt)).toBeVisible();
      await expect(footer.getByRole("link", { name: es.footer.about })).toHaveAttribute("href", "/acerca");
    }
  });
});
