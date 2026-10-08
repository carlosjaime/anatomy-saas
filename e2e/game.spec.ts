import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import es from "../app/i18n/messages/es-MX";
import en from "../app/i18n/messages/en-US";
import { format } from "../app/i18n/format";
import { ORGAN_TARGETS, type GameOrganId, type View } from "../app/lib/game/body-map";
import { register, switchLocale, uniqueEmail } from "./helpers";

const ANTERIOR_IDS = Object.keys(ORGAN_TARGETS.anterior) as GameOrganId[];
const POSTERIOR_IDS = Object.keys(ORGAN_TARGETS.posterior) as GameOrganId[];
const primary = (view: View, id: GameOrganId) => ORGAN_TARGETS[view][id]!.primary[0];

async function startGame(
  page: Page,
  mode: "learn" | "exam" | "timed",
  { difficulty = "guided", view = "anterior" }: { difficulty?: "guided" | "expert"; view?: "anterior" | "posterior" | "both" } = {},
) {
  await page.goto("/juego");
  // Las etiquetas son las tarjetas visibles; el radio nativo queda oculto pero accesible.
  await page.locator("label", { has: page.locator(`input[name="game-mode"][value="${mode}"]`) }).click();
  await page.locator("label", { has: page.locator(`input[name="game-difficulty"][value="${difficulty}"]`) }).click();
  await page.locator("label", { has: page.locator(`input[name="game-view"][value="${view}"]`) }).click();
  await expect(page.locator(`input[name="game-mode"][value="${mode}"]`)).toBeChecked();
  await page.getByTestId("game-start").click();
}

/** Coloca por teclado/toque: selecciona en la bandeja y elige la región en la lista. */
async function placeViaRegion(page: Page, organId: string, region: string) {
  await page.getByTestId(`tray-${organId}`).click();
  await page.getByTestId(`region-${region}`).click();
}

/** Arrastre real con el ratón hasta un punto del viewBox (400 × 720). */
async function dragTo(page: Page, organId: string, x: number, y: number) {
  const stage = (await page.getByTestId("game-stage").boundingBox())!;
  const item = (await page.getByTestId(`tray-${organId}`).boundingBox())!;
  await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
  await page.mouse.down();
  const target = { x: stage.x + (x / 400) * stage.width, y: stage.y + (y / 720) * stage.height };
  await page.mouse.move(target.x - 30, target.y - 20, { steps: 8 });
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await page.mouse.up();
}

test.describe("reto anatómico: arma el cuerpo humano", () => {
  test("vista posterior: convención invertida y órganos propios de la espalda", async ({ page }) => {
    await startGame(page, "learn", { view: "posterior" });
    await expect(page.getByTestId("game-stage")).toHaveAttribute("data-view", "posterior");
    await expect(page.getByTestId("tray-stomach")).toHaveCount(0);
    // Desde atrás, el bazo (izquierda del paciente) queda a la izquierda del observador.
    await dragTo(page, "spleen", 160, 372);
    await expect(page.getByTestId("placed-spleen")).toHaveAttribute("data-result", "correct");
    await dragTo(page, "kidneys", 240, 450);
    await expect(page.getByTestId("placed-kidneys")).toHaveAttribute("data-result", "correct");
    for (const id of POSTERIOR_IDS.filter((id) => id !== "spleen" && id !== "kidneys")) await placeViaRegion(page, id, primary("posterior", id));
    await expect(page.getByRole("dialog").getByTestId("result-accuracy")).toHaveText("100%");
  });

  test("vista completa: girar el cuerpo para colocar los 16 órganos", async ({ page }) => {
    await startGame(page, "learn", { view: "both" });
    await expect(page.getByTestId("tray-spinalCord")).toBeVisible();
    await expect(page.getByTestId("tray-stomach")).toBeVisible();
    await placeViaRegion(page, "stomach", "leftHypochondrium");
    await expect(page.getByTestId("placed-stomach")).toHaveAttribute("data-result", "correct");
    // La médula no se ubica de frente: la pista invita a girar.
    await page.getByTestId("tray-spinalCord").click();
    await page.getByTestId("game-hint").click();
    await expect(page.getByTestId("game-feedback")).toContainText(format(es.game.flipHint, { organ: "Médula espinal" }));
    await page.getByTestId("game-flip").click();
    await expect(page.getByTestId("game-stage")).toHaveAttribute("data-view", "posterior");
    await expect(page.getByTestId("game-stage")).not.toHaveClass(/flipping/);
    await expect(page.getByTestId("placed-stomach")).toHaveCount(0);
    // La selección se conserva al girar: la lista de regiones ya es la posterior.
    await expect(page.getByTestId("tray-spinalCord")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("region-vertebral").click();
    await expect(page.getByTestId("placed-spinalCord")).toHaveAttribute("data-result", "correct");
    await page.getByTestId("game-flip").click();
    await expect(page.getByTestId("placed-stomach")).toBeVisible();
  });

  test("arrastrar y soltar evalúa la región con la convención clínica", async ({ page }) => {
    await startGame(page, "learn");
    await dragTo(page, "heart", 205, 290);
    await expect(page.getByTestId("placed-heart")).toHaveAttribute("data-result", "correct");
    await expect(page.getByTestId("game-score")).not.toContainText(/\b0\b/);

    // Hígado del lado izquierdo del paciente (derecha de la figura): incorrecto.
    await dragTo(page, "liver", 240, 390);
    await expect(page.getByTestId("game-feedback")).toContainText(
      format(es.game.feedbackWrong, { organ: "Hígado", region: es.game.regions.leftHypochondrium }),
    );
    await expect(page.getByTestId("placed-liver")).toHaveCount(0);

    // Epigastrio: el hígado se extiende ahí → aceptable.
    await dragTo(page, "liver", 200, 390);
    await expect(page.getByTestId("placed-liver")).toHaveAttribute("data-result", "partial");
  });

  test("modo aprendizaje completo por teclado: 3 estrellas, récord y precisión 100 %", async ({ page }) => {
    await startGame(page, "learn");
    for (const id of ANTERIOR_IDS) await placeViaRegion(page, id, primary("anterior", id));
    const results = page.getByRole("dialog");
    await expect(results.getByRole("heading", { name: es.game.resultsTitle })).toBeVisible();
    await expect(results.getByTestId("result-accuracy")).toHaveText("100%");
    await expect(results.getByRole("img", { name: format(es.game.stars, { count: 3 }) })).toBeVisible();
    await expect(results.getByText(es.game.newBest)).toBeVisible();

    // Al cerrar se conserva el cuerpo armado y el récord queda guardado.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("placed-lungs")).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Récord: \d+ pts/)).toBeVisible();
  });

  test("modo examen: sin retroalimentación hasta evaluar y revisión por órgano", async ({ page }) => {
    await startGame(page, "exam");
    for (const id of ANTERIOR_IDS) {
      // Un error intencional: riñones en el epigastrio.
      await placeViaRegion(page, id, id === "kidneys" ? "epigastric" : primary("anterior", id));
    }
    await expect(page.getByTestId("pin-kidneys")).toBeVisible();
    await expect(page.getByTestId("placed-heart")).toHaveCount(0);
    await page.getByTestId("game-evaluate").click();
    const results = page.getByRole("dialog");
    await expect(results.getByTestId("review-kidneys")).toContainText(es.game.resultWrong);
    await expect(results.getByTestId("review-heart")).toContainText(es.game.resultCorrect);
    // 13 de 14 correctos.
    await expect(results.getByTestId("result-accuracy")).toHaveText("93%");
  });

  test("contrarreloj: un órgano a la vez con cuenta regresiva", async ({ page }) => {
    await startGame(page, "timed");
    await expect(page.getByTestId("game-clock")).toContainText(/1:(29|30)|1:2\d/);
    for (let round = 0; round < 3; round += 1) {
      const name = (await page.getByTestId("game-target").locator("b").textContent())!.trim();
      const id = await page.evaluate((label) => {
        const button = [...document.querySelectorAll<HTMLButtonElement>("[data-testid^='tray-']")].find((node) => node.textContent?.includes(label));
        return button?.dataset.testid?.replace("tray-", "") ?? "";
      }, name);
      await placeViaRegion(page, id, primary("anterior", id as GameOrganId));
      await expect(page.getByTestId(`placed-${id}`)).toBeVisible();
    }
    await page.getByTestId("game-pause").click();
    await expect(page.getByText(es.game.paused)).toBeVisible();
  });

  test("el cambio de idioma conserva la partida en curso", async ({ page }) => {
    await startGame(page, "learn");
    await placeViaRegion(page, "brain", "cranial");
    await switchLocale(page, "en-US");
    await expect(page.getByTestId("placed-brain")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.game.title);
    await page.getByTestId("tray-heart").click();
    await expect(page.getByTestId("region-mediastinum")).toHaveText(en.game.regions.mediastinum);
  });

  test("los resultados se registran en el panel de estudio", async ({ page }) => {
    await register(page, { email: uniqueEmail("game") });
    await startGame(page, "learn");
    for (const id of ANTERIOR_IDS) await placeViaRegion(page, id, primary("anterior", id));
    await expect(page.getByRole("dialog").getByText(es.game.saved)).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.locator(".recent-list")).toContainText(es.dashboard.kindPlacement);
    await expect(page.locator(".game-card")).toContainText(/Récord: \d+ pts/);
  });
});
