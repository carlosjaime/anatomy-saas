import assert from "node:assert/strict";
import test from "node:test";
import { organs } from "../app/lib/anatomy-data.ts";
import { studyGuides } from "../app/lib/encyclopedia-data.ts";
import { IDENTITY_SAMPLE, MOTION_BY_ORGAN, sampleMotion } from "../app/lib/three/motion.ts";

test("every organ has a motion profile and a complete study guide", () => {
  for (const organ of organs) {
    assert.ok(MOTION_BY_ORGAN[organ.id], organ.id);
    const guide = studyGuides[organ.id];
    assert.equal(guide.objectives.length, 3, `${organ.id} objectives`);
    assert.equal(guide.highYield.length, 3, `${organ.id} high-yield`);
    assert.ok(guide.pearl.length > 40, `${organ.id} pearl`);
  }
});

test("motion stays subtle: bounded scale and rotation for every profile", () => {
  for (const { profile } of Object.values(MOTION_BY_ORGAN)) {
    for (let t = 0; t < 20; t += 0.037) {
      const s = sampleMotion(profile, t);
      for (const key of ["sx", "sy", "sz"] as const) assert.ok(Math.abs(s[key] - 1) <= 0.06, `${profile} ${key}=${s[key]}`);
      for (const key of ["rx", "ry", "rz"] as const) assert.ok(Math.abs(s[key]) <= 0.4, `${profile} ${key}=${s[key]}`);
    }
  }
});

test("heartbeat is periodic at 72 bpm and contracts in systole", () => {
  const period = 60 / 72;
  const a = sampleMotion("heartbeat", 0.3);
  const b = sampleMotion("heartbeat", 0.3 + period * 5);
  assert.ok(Math.abs(a.sx - b.sx) < 1e-9);
  assert.ok(sampleMotion("heartbeat", period * 0.12).sx < 0.96, "systolic contraction");
});

test("sampling reuses the output object and resets it", () => {
  const out = { ...IDENTITY_SAMPLE, rx: 5 };
  const result = sampleMotion("breathing", 1, out);
  assert.equal(result, out);
  assert.equal(result.rz, 0);
});
