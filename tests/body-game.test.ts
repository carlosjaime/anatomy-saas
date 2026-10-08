import assert from "node:assert/strict";
import test from "node:test";
import { organs } from "../app/lib/anatomy-data.ts";
import {
  EXTRA_ORGAN_IDS,
  ORGAN_TARGETS,
  REGION_IDS_BY_VIEW,
  VIEWS,
  evaluatePlacement,
  regionAt,
  regionCenter,
  viewsFor,
  type GameOrganId,
} from "../app/lib/game/body-map.ts";
import { accuracy, comboMultiplier, placementPoints, starsFor, timeBonus } from "../app/lib/game/scoring.ts";

const ALL_ORGANS: GameOrganId[] = [...organs.map((organ) => organ.id), ...EXTRA_ORGAN_IDS];

test("every organ is placeable in at least one view and its regions are coherent", () => {
  for (const id of ALL_ORGANS) assert.ok(viewsFor(id).length > 0, `${id} has no view`);
  for (const view of VIEWS) {
    for (const [id, target] of Object.entries(ORGAN_TARGETS[view]) as [GameOrganId, NonNullable<(typeof ORGAN_TARGETS)[typeof view][GameOrganId]>][]) {
      for (const region of [...target.primary, ...target.partial]) {
        assert.ok(REGION_IDS_BY_VIEW[view].includes(region), `${view}/${id}: ${region} is not a ${view} region`);
      }
      for (const region of target.primary) {
        assert.equal(evaluatePlacement(view, id, regionCenter(region)).result, "correct", `${view}/${id} → ${region}`);
      }
      for (const region of target.partial) {
        assert.equal(evaluatePlacement(view, id, regionCenter(region)).result, "partial", `${view}/${id} ~ ${region}`);
      }
    }
  }
  assert.equal(Object.keys(ORGAN_TARGETS.anterior).length, 14);
  assert.equal(Object.keys(ORGAN_TARGETS.posterior).length, 7);
});

test("each region's center resolves to that same region in its view", () => {
  for (const view of VIEWS) {
    for (const id of REGION_IDS_BY_VIEW[view]) assert.equal(regionAt(view, regionCenter(id)), id, `${view}/${id}`);
  }
});

test("anterior view: the patient's right is the viewer's left", () => {
  assert.equal(evaluatePlacement("anterior", "liver", { x: 160, y: 390 }).result, "correct");
  assert.equal(evaluatePlacement("anterior", "liver", { x: 240, y: 390 }).result, "wrong");
  assert.equal(evaluatePlacement("anterior", "liver", { x: 200, y: 390 }).result, "partial");
  assert.equal(evaluatePlacement("anterior", "heart", { x: 205, y: 290 }).result, "correct");
  assert.equal(evaluatePlacement("anterior", "heart", { x: 240, y: 290 }).result, "partial");
  assert.equal(evaluatePlacement("anterior", "heart", { x: 160, y: 290 }).result, "wrong");
  assert.equal(evaluatePlacement("anterior", "spleen", { x: 240, y: 390 }).result, "correct");
  assert.equal(evaluatePlacement("anterior", "gallbladder", { x: 160, y: 400 }).result, "correct");
  assert.equal(evaluatePlacement("anterior", "bladder", { x: 200, y: 540 }).result, "correct");
  assert.equal(evaluatePlacement("anterior", "thyroid", { x: 200, y: 160 }).result, "correct");
});

test("posterior view: the patient's left is the viewer's left (we see the back)", () => {
  assert.equal(regionAt("posterior", { x: 160, y: 370 }), "leftThoracolumbar");
  assert.equal(evaluatePlacement("posterior", "spleen", { x: 160, y: 370 }).result, "correct");
  assert.equal(evaluatePlacement("posterior", "spleen", { x: 240, y: 370 }).result, "wrong");
  assert.equal(evaluatePlacement("posterior", "kidneys", { x: 240, y: 450 }).result, "correct");
  assert.equal(evaluatePlacement("posterior", "spinalCord", { x: 200, y: 300 }).result, "correct");
  assert.equal(evaluatePlacement("posterior", "adrenals", { x: 165, y: 380 }).result, "correct");
  // Órganos no visibles por detrás se evalúan como incorrectos en esa vista.
  assert.equal(evaluatePlacement("posterior", "heart", { x: 200, y: 290 }).result, "wrong");
  assert.deepEqual(viewsFor("lungs"), ["anterior", "posterior"]);
  assert.deepEqual(viewsFor("stomach"), ["anterior"]);
  assert.deepEqual(viewsFor("spinalCord"), ["posterior"]);
});

test("fine structures win over broad ones and outside points have no region", () => {
  assert.equal(regionAt("anterior", { x: 182, y: 98 }), "orbits");
  assert.equal(regionAt("anterior", { x: 200, y: 120 }), "face");
  assert.equal(regionAt("anterior", { x: 20, y: 20 }), null);
  assert.equal(evaluatePlacement("anterior", "brain", { x: 20, y: 20 }).region, null);
  assert.equal(evaluatePlacement("anterior", "skin", { x: 300, y: 470 }).result, "correct");
  assert.equal(evaluatePlacement("anterior", "intestine", { x: 200, y: 530 }).result, "partial");
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
