import { expect, test } from "./fixtures";
import es from "../app/i18n/messages/es-MX";
import en from "../app/i18n/messages/en-US";
import { switchLocale } from "./helpers";

test.describe("selector de idioma en tiempo real", () => {
  test("cambia es-MX ↔ en-US con fundido, sin recargar y persistiendo la elección", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(es.landing.titleA);

    // Marca la ventana: si el cambio recargara la página, la marca desaparecería.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
      const seen: string[] = [];
      (window as unknown as { __classes: string[] }).__classes = seen;
      new MutationObserver(() => seen.push(document.documentElement.className)).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    });

    await switchLocale(page, "en-US");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(en.landing.titleA);
    await expect(page.getByRole("status").filter({ hasText: en.language.changed })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    const classes = await page.evaluate(() => (window as unknown as { __classes: string[] }).__classes.join(" "));
    expect(classes).toContain("locale-leaving");
    expect(classes).toContain("locale-entering");

    const cookie = (await context.cookies()).find((item) => item.name === "atlas_locale");
    expect(cookie?.value).toBe("en-US");
    await expect(page).toHaveTitle(en.meta.title);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(en.landing.titleA);

    await switchLocale(page, "es-MX");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(es.landing.titleA);
  });

  test("negocia el idioma inicial desde Accept-Language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.auth.loginTitle);
    await context.close();
  });

  test("conserva el estado del atlas y re-traduce validaciones al cambiar de idioma", async ({ page }) => {
    await page.goto("/registro");
    await page.getByTestId("auth-submit").click();
    await expect(page.getByText(es.validation.nameRequired)).toBeVisible();
    await page.getByLabel(es.auth.email).fill("ana@");

    await switchLocale(page, "en-US");
    await expect(page.getByText(en.validation.nameRequired)).toBeVisible();
    await expect(page.getByText(en.validation.emailInvalid)).toBeVisible();
    // El texto escrito sobrevive al cambio de idioma.
    await expect(page.getByLabel(en.auth.email)).toHaveValue("ana@");

    await page.goto("/atlas");
    await page.getByTestId("organ-brain").click();
    await expect(page.getByTestId("organ-brain")).toHaveAttribute("aria-current", "true");
    await switchLocale(page, "es-MX");
    await expect(page.getByTestId("organ-brain")).toHaveAttribute("aria-current", "true");
    await expect(page.getByTestId("organ-brain")).toContainText("Cerebro");
  });
});
