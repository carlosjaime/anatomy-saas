import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PASSWORD = "Anatomia2026!";

/** Correo único por prueba para que las pruebas paralelas no se pisen. */
export function uniqueEmail(tag: string): string {
  return `${tag}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}@e2e.test`;
}

type Mail = { to: string; subject: string; text: string; html: string };

/** Espera el último correo enviado a `to` y devuelve el primer enlace que contiene `path`. */
export async function linkFromMailbox(request: APIRequestContext, to: string, path: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const response = await request.get(`/api/test/mailbox?to=${encodeURIComponent(to)}`);
      const { messages } = (await response.json()) as { messages: Mail[] };
      const urls = messages.flatMap((message) => message.text.match(/https?:\/\/\S+/g) ?? []);
      link = urls.reverse().find((url) => url.includes(path));
      return Boolean(link);
    }, { message: `correo con ${path} para ${to}` })
    .toBe(true);
  const url = new URL(link!);
  return `${url.pathname}${url.search}`;
}

export async function register(page: Page, { name = "Ana Pérez", email, role = "estudiante" }: { name?: string; email: string; role?: string }) {
  await page.goto("/registro");
  const form = page.getByTestId("register-form");
  await form.getByLabel(/nombre completo|full name/i).fill(name);
  await form.getByLabel(/correo electrónico|email/i).fill(email);
  await form.getByLabel(/^contraseña$|^password$/i).fill(PASSWORD);
  await form.locator(`input[name="role"][value="${role}"]`).check();
  await form.locator('input[type="checkbox"]').check();
  await form.getByTestId("auth-submit").click();
  await page.waitForURL(/\/(dashboard|atlas)/);
}

/** Cambia el idioma con el selector y espera a que termine el fundido. */
export async function switchLocale(page: Page, locale: "es-MX" | "en-US") {
  // El último en el DOM es el del modal abierto (si lo hay), que queda por encima.
  await page.getByTestId("language-switcher").last().click();
  await page.getByTestId(`locale-${locale}`).click();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.locator("html")).not.toHaveClass(/locale-leaving/);
}
