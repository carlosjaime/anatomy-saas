import assert from "node:assert/strict";
import test from "node:test";
import { billingConfig, isE2E, mailConfig } from "../app/lib/server/config.ts";

const KEYS = ["ATLAS_E2E", "VERCEL_ENV", "NODE_ENV", "MERCADOPAGO_ACCESS_TOKEN", "RESEND_API_KEY"] as const;

// `NODE_ENV` es de solo lectura en los tipos de Next; aquí se manipula a propósito.
const env = process.env as Record<string, string | undefined>;

function withEnv(values: Partial<Record<(typeof KEYS)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(KEYS.map((key) => [key, env[key]]));
  for (const key of KEYS) delete env[key];
  Object.assign(env, values);
  try {
    run();
  } finally {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete env[key];
      else env[key] = previous[key];
    }
  }
}

test("E2E mode enables demo billing and the memory mailbox on a production build", () => {
  withEnv({ NODE_ENV: "production", ATLAS_E2E: "1" }, () => {
    assert.equal(isE2E(), true);
    assert.equal(billingConfig().provider, "demo");
    assert.equal(mailConfig().provider, "memory");
  });
});

test("E2E mode can never activate on a real production deployment", () => {
  withEnv({ NODE_ENV: "production", ATLAS_E2E: "1", VERCEL_ENV: "production" }, () => {
    assert.equal(isE2E(), false);
    assert.equal(billingConfig().provider, "none");
    assert.equal(mailConfig().provider, "none");
  });
  withEnv({ NODE_ENV: "production", ATLAS_E2E: "1", MERCADOPAGO_ACCESS_TOKEN: "APP_USR-x", RESEND_API_KEY: "re_x" }, () => {
    assert.equal(isE2E(), false);
    assert.equal(billingConfig().provider, "mercadopago");
    assert.equal(mailConfig().provider, "resend");
  });
  withEnv({ NODE_ENV: "production" }, () => {
    assert.equal(isE2E(), false);
    assert.equal(billingConfig().provider, "none");
  });
});
