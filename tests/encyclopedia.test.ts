import assert from "node:assert/strict";
import test from "node:test";
import { organs } from "../app/lib/anatomy-data.ts";
import {
  ARTICLE_SECTIONS,
  articles,
  glossary,
  indexLetter,
  normalize,
  searchEncyclopedia,
} from "../app/lib/encyclopedia-data.ts";

const organIds = new Set<string>(organs.map((organ) => organ.id));

test("every organ has a complete article with valid cross-links", () => {
  assert.deepEqual(new Set(Object.keys(articles)), organIds);
  for (const organ of organs) {
    const article = articles[organ.id];
    assert.ok(article.etymology.length > 10, `${organ.id} etymology`);
    for (const { id } of ARTICLE_SECTIONS) {
      assert.ok(article.sections[id].length > 80, `${organ.id}.${id} is too short`);
    }
    assert.ok(article.related.length > 0);
    for (const related of article.related) {
      assert.ok(organIds.has(related), `${organ.id} links unknown ${related}`);
      assert.notEqual(related, organ.id, `${organ.id} links to itself`);
    }
  }
});

test("glossary terms are unique and reference known organs", () => {
  const terms = glossary.map((entry) => normalize(entry.term));
  assert.equal(new Set(terms).size, terms.length);
  for (const entry of glossary) {
    if (entry.organId) assert.ok(organIds.has(entry.organId), entry.term);
    assert.ok(entry.definition.endsWith("."), `${entry.term} definition should be a sentence`);
  }
});

test("normalisation folds accents and case", () => {
  assert.equal(normalize("  Hígado "), "higado");
  assert.equal(indexLetter("Íleon"), "I");
  assert.equal(indexLetter("Válvula"), "V");
});

test("search is accent-insensitive and ranks title matches first", () => {
  const hits = searchEncyclopedia("valvula mitral", organs);
  assert.equal(hits[0]?.kind, "structure");
  assert.equal(hits[0]?.title, "Válvula mitral");

  const kidney = searchEncyclopedia("RIÑONES", organs);
  assert.equal(kidney[0]?.kind, "organ");
  assert.equal(kidney[0]?.organId, "kidneys");

  const term = searchEncyclopedia("nefrona", organs);
  assert.ok(term.some((hit) => hit.kind === "term" && hit.title === "Nefrona"));
});

test("search ignores trivial queries and respects the limit", () => {
  assert.deepEqual(searchEncyclopedia("", organs), []);
  assert.deepEqual(searchEncyclopedia("a", organs), []);
  assert.ok(searchEncyclopedia("de", organs, 5).length <= 5);
});
