import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNUAL_DISCOUNT,
  PLANS,
  annualSavings,
  billedAmount,
  formatMXN,
  hasFeature,
  monthlyEquivalent,
  parsePlan,
} from "../app/lib/plans.ts";

test("catalog prices are whole MXN amounts in ascending order", () => {
  const prices = PLANS.map((plan) => plan.monthlyPrice);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  for (const price of prices) assert.ok(Number.isInteger(price) && price >= 0);
  assert.equal(new Set(PLANS.map((plan) => plan.id)).size, PLANS.length);
  assert.equal(PLANS.filter((plan) => plan.highlight).length, 1);
});

test("annual billing applies the discount and reports savings", () => {
  assert.equal(monthlyEquivalent("student", "monthly"), 129);
  assert.equal(monthlyEquivalent("student", "annual"), Math.round(129 * (1 - ANNUAL_DISCOUNT)));
  assert.equal(billedAmount("pro", "monthly"), 249);
  assert.equal(billedAmount("pro", "annual"), monthlyEquivalent("pro", "annual") * 12);
  assert.equal(annualSavings("pro"), 249 * 12 - billedAmount("pro", "annual"));
  assert.equal(annualSavings("free"), 0);
  for (const plan of PLANS) {
    assert.ok(billedAmount(plan.id, "annual") <= plan.monthlyPrice * 12);
  }
});

test("formats amounts as Mexican pesos without decimals", () => {
  assert.equal(formatMXN(0), "$0");
  assert.equal(formatMXN(1999), "$1,999");
  assert.equal(formatMXN(1238.4), "$1,238");
});

test("parsePlan only trusts known plan ids", () => {
  assert.equal(parsePlan("pro"), "pro");
  assert.equal(parsePlan("institution"), "institution");
  for (const bad of [null, undefined, "", "PRO", "admin", 42, {}, "__proto__", "toString"]) {
    assert.equal(parsePlan(bad), "free", `expected ${String(bad)} to fall back to free`);
  }
});

test("entitlements escalate with each tier", () => {
  assert.equal(hasFeature("free", "allOrgans"), false);
  assert.equal(hasFeature("student", "allOrgans"), true);
  assert.equal(hasFeature("student", "clinicalCorrelation"), false);
  assert.equal(hasFeature("pro", "clinicalCorrelation"), true);
  assert.equal(hasFeature("institution", "clinicalCorrelation"), true);
});
