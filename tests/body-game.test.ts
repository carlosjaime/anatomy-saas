import assert from "node:assert/strict";
import test from "node:test";
import { organs } from "../app/lib/anatomy-data.ts";
import { ORGAN_TARGETS, REGION_IDS, evaluatePlacement, regionAt, regionCenter } from "../app/lib/game/body-map.ts";
import { accuracy, comboMultiplier, placementPoints, starsFor, timeBonus } from "../app/lib/game/scoring.ts";

test("every organ has a target and its primary regions are the correct answer", () => {
  assert.deepEqual(new Set(Object.keys(ORGAN_TARGETS)), new Set(organs.map((organ) => organ.id)));
  for (const organ of organs) {
    const target = ORGAN_TARGETS[organ.id];
    for (const region of target.primary) {
      assert.equal(evaluatePlacement(organ.id, regionCenter(region)).result, "correct", `${organ.id} → ${region}`);
    }
    for (const region of target.partial) {
      assert.equal(evaluatePlacement(organ.id, regionCenter(region)).result, "partial", `${organ.id} ~ ${region}`);
    }
    for (const region of [...target.primary, ...target.partial]) {
      assert.ok(REGION_IDS.includes(region));
    }
  }
});

test("each region's center resolves to that same region", () => {
  for (const id of REGION_IDS) assert.equal(regionAt(regionCenter(id)), id, id);
});

test("follows the clinical convention: patient's right is the viewer's left", () => {
  // Hígado en el hipocondrio derecho (lado izquierdo de la figura).
  assert.equal(evaluatePlacement("liver", { x: 160, y: 390 }).result, "correct");
  assert.equal(evaluatePlacement("liver", { x: 240, y: 390 }).result, "wrong");
  assert.equal(evaluatePlacement("liver", { x: 200, y: 390 }).result, "partial");
  // El corazón es mediastínico con la punta a la izquierda: aceptable en el hemitórax izquierdo.
  assert.equal(evaluatePlacement("heart", { x: 205, y: 290 }).result, "correct");
  assert.equal(evaluatePlacement("heart", { x: 240, y: 290 }).result, "partial");
  assert.equal(evaluatePlacement("heart", { x: 160, y: 290 }).result, "wrong");
});

test("fine structures win over broad ones and outside points have no region", () => {
  assert.equal(regionAt({ x: 182, y: 98 }), "orbits");
  assert.equal(regionAt({ x: 200, y: 120 }), "face");
  assert.equal(regionAt({ x: 20, y: 20 }), null);
  assert.equal(evaluatePlacement("brain", { x: 20, y: 20 }).region, null);
  assert.equal(evaluatePlacement("skin", { x: 300, y: 470 }).result, "correct");
  assert.equal(evaluatePlacement("kidneys", { x: 160, y: 460 }).result, "correct");
  assert.equal(evaluatePlacement("intestine", { x: 200, y: 530 }).result, "partial");
});

test("scoring rewards first attempts, combos and expert difficulty", () => {
  assert.equal(placementPoints("correct", 0, 0, "guided"), 100);
  assert.equal(placementPoints("correct", 0, 2, "guided"), 150);
  assert.equal(placementPoints("correct", 0, 10, "guided"), 200);
  assert.equal(placementPoints("correct", 1, 4, "guided"), 60);
  assert.equal(placementPoints("partial", 0, 3, "guided"), 50);
  assert.equal(placementPoints("wrong", 0, 0, "expert"), 0);
  assert.equal(placementPoints("correct", 0, 0, "expert"), 150);
  assert.equal(comboMultiplier(-1), 1);
  assert.equal(timeBonus(12_400, "guided"), 60);
  assert.equal(accuracy(["correct", "partial", "wrong", "correct"], 4), 0.625);
  assert.equal(accuracy([], 0), 0);
  assert.deepEqual([0.95, 0.75, 0.45, 0.1].map(starsFor), [3, 2, 1, 0]);
});
