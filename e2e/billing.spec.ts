import { expect, test } from "./fixtures";
import es from "../app/i18n/messages/es-MX";
import { linkFromMailbox, register, uniqueEmail } from "./helpers";

test.describe("suscripciones (proveedor de demostración)", () => {
  test("un correo sin verificar no puede suscribirse", async ({ page }) => {
    await register(page, { email: uniqueEmail("unverified") });
    await page.goto("/atlas?panel=plans");
    await page.getByTestId("checkout-pro").click();
    await expect(page.getByRole("dialog").getByRole("alert").first()).toContainText(es.errors.emailUnverified);
  });

  test("prueba gratis → plan activo con confeti → cancelación confirmada", async ({ page, request }) => {
    const email = uniqueEmail("billing");
    await register(page, { email });
    await page.goto(await linkFromMailbox(request, email, "/verificar"));

    await page.goto("/atlas?panel=plans");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: es.plans.title })).toBeVisible();
    await dialog.getByRole("radio", { name: es.plans.monthly }).click();
    await dialog.getByTestId("checkout-pro").click();

    await expect(page).toHaveURL(/\/cuenta\?/);
    await expect(page.getByTestId("account-banner")).toContainText(es.plans.catalog.pro.name);
    await expect(page.getByTestId("current-plan")).toHaveText(es.plans.catalog.pro.name);
    await expect(page.locator(".status-pill.trial")).toHaveText(es.account.trial);
    await expect(page.locator(".confetti-canvas")).toBeAttached();

    await page.getByTestId("cancel-subscription").click();
    const confirm = page.getByRole("dialog");
    await expect(confirm.getByRole("heading", { name: es.confirm.cancelTitle })).toBeVisible();
    // "Conservar plan" cierra sin cancelar.
    await confirm.getByRole("button", { name: es.confirm.keepPlan }).click();
    await expect(confirm).toBeHidden();

    await page.getByTestId("cancel-subscription").click();
    await page.getByRole("dialog").getByTestId("confirm-action").click();
    await expect(page).toHaveURL(/billing=cancelled/);
    await expect(page.getByTestId("account-banner")).toHaveText(es.account.cancelledNotice);
    await expect(page.locator(".status-pill.cancelled")).toHaveText(es.account.cancelled);
    await expect(page.getByRole("status").filter({ hasText: es.toasts.subscriptionCancelled })).toBeVisible();
  });
});
