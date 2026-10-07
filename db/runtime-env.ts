/**
 * Puente para los bindings de Cloudflare. El entry del Worker los registra en
 * cada petición; el resto del código los lee sin importar `cloudflare:workers`,
 * un módulo que no existe en Node/Vercel y rompería `next build`.
 */
type RuntimeEnv = { DB?: D1Database };

const KEY = Symbol.for("atlas-anatomico.runtime-env");
type GlobalWithEnv = typeof globalThis & { [KEY]?: RuntimeEnv };

export function setRuntimeEnv(env: RuntimeEnv | undefined): void {
  if (env) (globalThis as GlobalWithEnv)[KEY] = env;
}

export function getD1Binding(): D1Database | undefined {
  return (globalThis as GlobalWithEnv)[KEY]?.DB;
}
