import { expect, test } from "./fixtures";
import es from "../app/i18n/messages/es-MX";
import { format } from "../app/i18n/format";
import { PASSWORD, linkFromMailbox, register, uniqueEmail } from "./helpers";

test.describe("autenticación", () => {
  test("el registro valida todos los campos en vivo y enfoca el primero inválido", async ({ page }) => {
    await page.goto("/registro");
    const form = page.getByTestId("register-form");
    await form.getByTestId("auth-submit").click();

    for (const message of [es.validation.nameRequired, es.validation.emailRequired, es.validation.roleRequired, es.validation.termsRequired]) {
      await expect(form.getByText(message)).toBeVisible();
    }
    await expect(form.getByText(format(es.validation.passwordMin, { min: 10 }))).toBeVisible();
    await expect(form.getByLabel(es.auth.name)).toBeFocused();
    await expect(form.getByLabel(es.auth.name)).toHaveAttribute("aria-invalid", "true");

    // La validación acompaña la escritura y marca los campos correctos.
    await form.getByLabel(es.auth.name).fill("Ana Pérez");
    await expect(form.getByText(es.validation.nameRequired)).toBeHidden();
    await expect(form.locator(".field.is-valid")).toHaveCount(1);

    await form.getByLabel(es.auth.password, { exact: true }).fill("abcdefghij");
    await expect(form.getByText(es.validation.passwordMix)).toBeVisible();
    await form.getByLabel(es.auth.password, { exact: true }).fill("Abcdefghij12!x");
    await expect(form.locator(".strength")).toHaveAttribute("data-level", /[34]/);
  });

  test("protege las rutas privadas y vuelve al destino tras iniciar sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("flujo completo: registro → verificación → cierre de sesión → inicio de sesión", async ({ page, request }) => {
    const email = uniqueEmail("flow");
    await register(page, { email });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("status").filter({ hasText: es.toasts.registered })).toBeVisible();
    await expect(page.locator(".verify-banner")).toBeVisible();

    const verifyLink = await linkFromMailbox(request, email, "/verificar");
    await page.goto(verifyLink);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.auth.verifiedTitle);
    await page.goto("/dashboard");
    await expect(page.locator(".verify-banner")).toHaveCount(0);

    // Cerrar sesión pide confirmación en un modal.
    await page.getByTestId("logout").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: es.confirm.logoutTitle })).toBeVisible();
    await dialog.getByTestId("confirm-action").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("status").filter({ hasText: es.toasts.loggedOut })).toBeVisible();

    await page.goto("/login");
    const form = page.getByTestId("login-form");
    await form.getByLabel(es.auth.email).fill(email);
    await form.getByLabel(es.auth.password, { exact: true }).fill("Equivocada123");
    await form.getByTestId("auth-submit").click();
    await expect(form.getByRole("alert")).toContainText(es.errors.invalidCredentials);

    await form.getByLabel(es.auth.password, { exact: true }).fill(PASSWORD);
    await form.getByTestId("auth-submit").click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("status").filter({ hasText: format(es.toasts.welcome, { name: "Ana" }) })).toBeVisible();
  });

  test("rechaza un correo ya registrado con error en el campo", async ({ page, browser }) => {
    const email = uniqueEmail("dup");
    await register(page, { email });
    const fresh = await browser.newContext({ locale: "es-MX" });
    const other = await fresh.newPage();
    await other.goto("/registro");
    const form = other.getByTestId("register-form");
    await form.getByLabel(es.auth.name).fill("Otra Persona");
    await form.getByLabel(es.auth.email).fill(email);
    await form.getByLabel(es.auth.password, { exact: true }).fill(PASSWORD);
    await form.locator('input[name="role"][value="medico"]').check();
    await form.locator('input[type="checkbox"]').check();
    await form.getByTestId("auth-submit").click();
    await expect(form.getByText(es.errors.emailTakenField)).toBeVisible();
    await fresh.close();
  });

  test("recuperación de contraseña de extremo a extremo", async ({ page, request, browser }) => {
    const email = uniqueEmail("reset");
    await register(page, { email });

    const guest = await browser.newContext({ locale: "es-MX" });
    const tab = await guest.newPage();
    await tab.goto("/recuperar");
    await tab.getByTestId("forgot-submit").click();
    await expect(tab.getByText(es.validation.emailRequired)).toBeVisible();
    await tab.getByLabel(es.auth.email).fill(email);
    await tab.getByTestId("forgot-submit").click();
    await expect(tab.getByTestId("forgot-sent")).toContainText(es.errors.resetGeneric);

    const resetLink = await linkFromMailbox(request, email, "/restablecer");
    await tab.goto(resetLink);
    const form = tab.getByTestId("reset-form");
    await form.getByLabel(es.auth.newPassword).fill("NuevaClave2026");
    await form.getByLabel(es.auth.confirmPassword).fill("OtraClave2026");
    await form.getByTestId("reset-submit").click();
    await expect(form.getByText(es.validation.passwordMismatch)).toBeVisible();
    await form.getByLabel(es.auth.confirmPassword).fill("NuevaClave2026");
    await form.getByTestId("reset-submit").click();
    await expect(tab).toHaveURL(/\/dashboard\?password=updated/);
    await expect(tab.getByText(es.dashboard.passwordUpdated)).toBeVisible();
    await expect(tab.getByRole("status").filter({ hasText: es.toasts.passwordUpdated })).toBeVisible();

    // La sesión original se cerró por seguridad.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await guest.close();
  });
});
