import { createClient, type Client } from "@libsql/client";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { migrate } from "./migrations";
import { getD1Binding } from "./runtime-env";
import * as schema from "./schema";

/**
 * Conexión a la base de datos (libSQL / SQLite).
 *
 * Mismo esquema y mismas consultas Drizzle sobre dos drivers:
 *  - Cloudflare Workers (y `vinext dev`): binding D1 `DB`, si existe.
 *  - Vercel / Node: libSQL con `DATABASE_URL` remoto (p. ej. Turso) o un
 *    archivo local en desarrollo (`file:.data/atlas.db`).
 *
 * Sin `DATABASE_URL` en producción no hay persistencia posible, así que se
 * lanza `DatabaseUnavailableError` y las rutas responden 503 con un mensaje
 * claro en lugar de fallar de forma opaca.
 */

/** Tipo común a ambos drivers: el código de dominio no sabe cuál se usa. */
export type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export class DatabaseUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

const LOCAL_DATABASE_URL = "file:.data/atlas.db";

function readEnv(name: string): string | undefined {
  const value = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return value && value.trim() ? value.trim() : undefined;
}

function resolveUrl(): string {
  const url = readEnv("DATABASE_URL");
  if (url) return url;
  if (readEnv("NODE_ENV") === "production") {
    throw new DatabaseUnavailableError(
      "Las cuentas no están disponibles: configura DATABASE_URL (y DATABASE_AUTH_TOKEN si aplica) en el entorno de despliegue.",
    );
  }
  return LOCAL_DATABASE_URL;
}

async function ensureLocalDirectory(url: string) {
  if (!url.startsWith("file:")) return;
  try {
    const { mkdir } = await import("node:fs/promises");
    const path = url.slice("file:".length);
    const slash = path.lastIndexOf("/");
    if (slash > 0) await mkdir(path.slice(0, slash), { recursive: true });
  } catch {
    // Runtimes sin sistema de archivos: createClient reportará el problema.
  }
}

/** Crea una conexión lista para usar sobre un cliente libSQL existente. */
export async function connect(client: Client): Promise<Database> {
  await client.execute("PRAGMA foreign_keys = ON").catch(() => {
    // Algunos servidores remotos no aceptan PRAGMA; las FK se aplican igual allí.
  });
  await migrate({
    run: async (sql) => {
      await client.execute(sql);
    },
    appliedVersions: async () =>
      (await client.execute("SELECT version FROM schema_migrations")).rows.map((row) => Number(row.version)),
  });
  return drizzleLibsql(client, { schema });
}

async function connectD1(binding: D1Database): Promise<Database> {
  await migrate({
    run: async (sql) => {
      await binding.prepare(sql).run();
    },
    appliedVersions: async () =>
      ((await binding.prepare("SELECT version FROM schema_migrations").all<{ version: number }>()).results ?? []).map((row) =>
        Number(row.version),
      ),
  });
  return drizzleD1(binding, { schema });
}

let pending: Promise<Database> | null = null;

/** Conexión memoizada por proceso/isolate, con el esquema ya aplicado. */
export function getDb(): Promise<Database> {
  pending ??= (async () => {
    const d1 = getD1Binding();
    if (d1) {
      try {
        return await connectD1(d1);
      } catch (error) {
        throw new DatabaseUnavailableError("No se pudo inicializar la base de datos D1.", { cause: error });
      }
    }
    const url = resolveUrl();
    await ensureLocalDirectory(url);
    try {
      return await connect(createClient({ url, authToken: readEnv("DATABASE_AUTH_TOKEN") }));
    } catch (error) {
      throw new DatabaseUnavailableError("No se pudo conectar con la base de datos.", { cause: error });
    }
  })().catch((error) => {
    // Permite reintentar en la siguiente petición tras un fallo transitorio.
    pending = null;
    throw error;
  });
  return pending;
}
