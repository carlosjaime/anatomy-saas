import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { modelUrlForDetail } from "../app/lib/three/lod.ts";
import { organs } from "../app/lib/anatomy-data.ts";

test("low detail maps every model to its LOD1 and leaves full detail untouched", () => {
  assert.equal(modelUrlForDetail("/models/heart.glb", true), "/models/lod1/heart.glb");
  assert.equal(modelUrlForDetail("/models/heart.glb", false), "/models/heart.glb");
  assert.equal(modelUrlForDetail("/models/lod1/heart.glb", true), "/models/lod1/heart.glb", "idempotent");
  assert.equal(modelUrlForDetail("https://cdn.example/heart.glb", true), "https://cdn.example/heart.glb");
});

test("every organ ships both detail levels and LOD1 is lighter", () => {
  const report = JSON.parse(readFileSync("public/models/lod1/report.json", "utf8")) as {
    models: { model: string; lod0: { triangles: number; bytes: number }; lod1: { triangles: number; bytes: number }; bboxDrift: number }[];
  };
  for (const organ of organs) {
    assert.ok(existsSync(`public${organ.model}`), organ.model);
    assert.ok(existsSync(`public${modelUrlForDetail(organ.model, true)}`), `LOD1 for ${organ.id}`);
    const entry = report.models.find((item) => `/models/${item.model}.glb` === organ.model);
    assert.ok(entry, `report entry for ${organ.id}`);
    assert.ok(entry.lod1.triangles < entry.lod0.triangles && entry.lod1.bytes < entry.lod0.bytes);
    assert.ok(entry.bboxDrift < 0.01, "hotspot space preserved");
  }
});
