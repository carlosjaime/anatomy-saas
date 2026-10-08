import { expect, test } from "./fixtures";
import es from "../app/i18n/messages/es-MX";
import en from "../app/i18n/messages/en-US";
import { format } from "../app/i18n/format";
import { switchLocale } from "./helpers";

test.describe("atlas 3D y enciclopedia", () => {
  test("selecciona órganos, responde el cuestionario y recibe retroalimentación", async ({ page }) => {
    await page.goto("/atlas");
    await expect(page.locator("canvas").first()).toBeVisible();

    await page.getByTestId("organ-lungs").click();
    await expect(page.getByTestId("organ-lungs")).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("complementary", { name: format(es.info.panel, { organ: "Pulmones" }) })).toBeVisible();

    await page.getByTestId("quiz-open").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: format(es.learning.quizTitle, { organ: "Pulmones" }) })).toBeVisible();
    await dialog.getByTestId("quiz-option-0").click();
    await expect(dialog.locator(".quiz-feedback")).toBeVisible();
    await expect(dialog.getByTestId("quiz-option-1")).toBeDisabled();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("los órganos Pro muestran el muro de pago a invitados", async ({ page }) => {
    await page.goto("/atlas");
    await page.getByTestId("organ-pancreas").click();
    await expect(page.locator(".pro-paywall, .locked-cards").first()).toBeVisible();
  });

  test("busca en la enciclopedia, navega el glosario y voltea tarjetas", async ({ page }) => {
    await page.goto("/atlas?panel=encyclopedia");
    const search = page.getByRole("searchbox", { name: es.encyclopedia.searchLabel });
    await search.fill("nefrona");
    await expect(page.locator(".results-count")).toContainText(/\d+/);
    await expect(page.locator(".search-results li").first()).toBeVisible();

    await page.getByRole("tab", { name: es.encyclopedia.glossary }).click();
    await expect(page.getByRole("tab", { name: es.encyclopedia.glossary })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: es.encyclopedia.flashcards }).click();
    const card = page.locator(".flashcard");
    await expect(card).toBeVisible();
    await card.click();
    await expect(card).toHaveClass(/flipped/);

    // Cambiar de idioma conserva la pestaña activa.
    await switchLocale(page, "en-US");
    await expect(page.getByRole("tab", { name: en.encyclopedia.flashcards })).toHaveAttribute("aria-selected", "true");
  });

  test("el diálogo de planes muestra precios en MXN y alterna el ciclo", async ({ page }) => {
    await page.goto("/atlas?panel=plans");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: es.plans.title })).toBeVisible();
    await expect(dialog.locator(".plan-card")).toHaveCount(4);
    await dialog.getByRole("radio", { name: es.plans.monthly }).click();
    await expect(dialog.getByRole("radio", { name: es.plans.monthly })).toHaveAttribute("aria-checked", "true");
    await expect(dialog.locator(".plan-price").nth(1)).toContainText("$129");
    await expect(dialog.locator(".plan-price").nth(2)).toContainText("$249");
  });

  test("la página 404 está localizada", async ({ page }) => {
    const response = await page.goto("/no-existe");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.pages.notFoundTitle);
  });
});
