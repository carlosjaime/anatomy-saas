import assert from "node:assert/strict";
import test from "node:test";
import { billingConfig, isE2E, mailConfig, parsePlanIds } from "../app/lib/server/config.ts";

const KEYS = [
  "ATLAS_E2E",
  "VERCEL_ENV",
  "NODE_ENV",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_ENVIRONMENT",
  "PAYPAL_PLAN_IDS",
  "PAYPAL_WEBHOOK_ID",
  "RESEND_API_KEY",
] as const;

const PLAN_IDS = JSON.stringify({
  "student:monthly": "P-STUDENTMONTHLY01",
  "student:annual": "P-STUDENTANNUAL001",
  "pro:monthly": "P-PROMONTHLY00001",
  "pro:annual": "P-PROANNUAL000001",
});

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
  withEnv({ NODE_ENV: "production", ATLAS_E2E: "1", PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret", PAYPAL_PLAN_IDS: PLAN_IDS, RESEND_API_KEY: "re_x" }, () => {
    assert.equal(isE2E(), false);
    assert.equal(billingConfig().provider, "paypal");
    assert.equal(mailConfig().provider, "resend");
  });
  withEnv({ NODE_ENV: "production" }, () => {
    assert.equal(isE2E(), false);
    assert.equal(billingConfig().provider, "none");
  });
});

test("PayPal config defaults to sandbox and requires an explicit live switch", () => {
  withEnv({ PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret", PAYPAL_PLAN_IDS: PLAN_IDS }, () => {
    const config = billingConfig();
    assert.equal(config.provider, "paypal");
    assert.equal(config.provider === "paypal" && config.environment, "sandbox");
    assert.equal(config.provider === "paypal" && config.webhookId, null);
  });
  withEnv({ PAYPAL_CLIENT_ID: "id", PAYPAL_CLIENT_SECRET: "secret", PAYPAL_PLAN_IDS: PLAN_IDS, PAYPAL_ENVIRONMENT: "production" }, () => {
    assert.equal(billingConfig().provider, "none", "typos never fall through to live");
  });
  withEnv({ PAYPAL_CLIENT_ID: "id", PAYPAL_PLAN_IDS: PLAN_IDS }, () => {
    assert.equal(billingConfig().provider, "none", "incomplete credentials disable payments");
  });
});

test("plan ids must cover every paid plan and cycle with well-formed ids", () => {
  assert.ok(parsePlanIds(PLAN_IDS));
  const partial = JSON.parse(PLAN_IDS) as Record<string, string>;
  delete partial["pro:annual"];
  assert.equal(parsePlanIds(JSON.stringify(partial)), null);
  assert.equal(parsePlanIds(JSON.stringify({ ...JSON.parse(PLAN_IDS), "free:monthly": "P-FREEPLAN00001" })), null);
  assert.equal(parsePlanIds(JSON.stringify({ ...JSON.parse(PLAN_IDS), "institution:monthly": "P-INSTMONTHLY0001" })), null, "not sold online yet");
  assert.equal(parsePlanIds(JSON.stringify({ ...JSON.parse(PLAN_IDS), "pro:monthly": "javascript:alert(1)" })), null);
  assert.equal(parsePlanIds("{not json"), null);
  assert.equal(parsePlanIds(undefined), null);
});
