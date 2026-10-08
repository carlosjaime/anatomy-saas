import assert from "node:assert/strict";
import test from "node:test";
import { organs } from "../app/lib/anatomy-data.ts";
import { getAtlasContent } from "../app/content/index.ts";
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

const esContent = { organs, articles, sections: ARTICLE_SECTIONS, glossary };

test("search is accent-insensitive and ranks title matches first", () => {
  const hits = searchEncyclopedia("valvula mitral", esContent);
  assert.equal(hits[0]?.kind, "structure");
  assert.equal(hits[0]?.title, "Válvula mitral");

  const kidney = searchEncyclopedia("RIÑONES", esContent);
  assert.equal(kidney[0]?.kind, "organ");
  assert.equal(kidney[0]?.organId, "kidneys");

  const term = searchEncyclopedia("nefrona", esContent);
  assert.ok(term.some((hit) => hit.kind === "term" && hit.title === "Nefrona"));
});

test("search ignores trivial queries and respects the limit", () => {
  assert.deepEqual(searchEncyclopedia("", esContent), []);
  assert.deepEqual(searchEncyclopedia("a", esContent), []);
  assert.ok(searchEncyclopedia("de", esContent, 5).length <= 5);
});

test("English content is complete and searchable", () => {
  const en = getAtlasContent("en-US");
  const es = getAtlasContent("es-MX");
  assert.equal(en.organs.length, es.organs.length);
  for (const [index, organ] of en.organs.entries()) {
    const base = es.organs[index];
    assert.equal(organ.id, base.id);
    assert.equal(organ.model, base.model, "geometry is shared");
    assert.notEqual(organ.name, base.name, `${organ.id} name translated`);
    assert.equal(organ.hotspots.length, base.hotspots.length);
    for (const [i, hotspot] of organ.hotspots.entries()) {
      assert.deepEqual(hotspot.position, base.hotspots[i].position);
      assert.ok(hotspot.label && hotspot.detail, `${organ.id}.${hotspot.id} translated`);
    }
    assert.equal(organ.quiz.correctIndex, base.quiz.correctIndex);
    assert.equal(organ.quiz.options.length, base.quiz.options.length);
    assert.equal(organ.conditions.length, base.conditions.length);
    for (const { id } of en.sections) assert.ok(en.articles[organ.id].sections[id].length > 80, `${organ.id}.${id}`);
    assert.equal(en.guides[organ.id].objectives.length, 3);
  }
  assert.equal(en.glossary.length, es.glossary.length);
  assert.equal(new Set(en.glossary.map((entry) => entry.term)).size, en.glossary.length);
  const hits = searchEncyclopedia("mitral valve", en);
  assert.equal(hits[0]?.title, "Mitral valve");
  assert.ok(searchEncyclopedia("nephron", en).some((hit) => hit.kind === "term" && hit.title === "Nephron"));
  assert.equal(getAtlasContent("en-US"), en, "content is memoized per locale");
});
