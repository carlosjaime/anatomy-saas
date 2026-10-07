import { defineConfig } from "drizzle-kit";

// Para `drizzle-kit studio` / `push` contra la misma base que usa la app.
// El esquema se aplica también en tiempo de ejecución (db/bootstrap.ts).
export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:.data/atlas.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
