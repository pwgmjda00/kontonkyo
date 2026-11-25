import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  PHRASES,
  PHRASE_MAP,
  BUILTIN_IDS,
  LEGACY_IDS,
  CATALOG_RELEASES,
  dailyIds,
  duelIds,
  validDay,
  addDays,
  weekStart,
  jstDay,
  submissionPhraseId,
} from "../../muka1-preview/catalog.js";

function legacyDaily(date) {
  let seed = Array.from(date).reduce(
    (s, ch) => (Math.imul(s, 31) + ch.charCodeAt(0)) | 0,
    17,
  );
  const a = Array.from({ length: 256 }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 8);
}
test("all 512 stable IDs are unique, dense records and valid strings", () => {
  assert.equal(PHRASES.length, 512);
  assert.equal(PHRASE_MAP.size, 512);
  assert.deepEqual(BUILTIN_IDS.slice(0, 256), LEGACY_IDS);
  assert.deepEqual(
    BUILTIN_IDS.slice(256),
    Array.from({ length: 256 }, (_, i) => 1000255 + i),
  );
  assert.ok(
    PHRASES.every(
      (p) =>
        Number.isSafeInteger(p.id) &&
        p.text.length >= 5 &&
        p.text.length <= 140,
    ),
  );
  const normalized = PHRASES.map((p) =>
    p.text.normalize("NFKC").replace(/[\p{P}\p{S}\s]/gu, ""),
  );
  assert.equal(new Set(normalized).size, 512);
});
test("all original 256 texts remain byte-for-byte equal to the legacy catalog", () => {
  const digest = createHash("sha256")
    .update(JSON.stringify(PHRASES.slice(0, 256).map((p) => p.text)))
    .digest("hex");
  assert.equal(
    digest,
    "80f6f3f79cf4b6de5e6730f121179458e7c471813f751e04fdbe934939983c64",
  );
});
test("every previously available day keeps the original tournament seed and order", () => {
  for (let day = "2020-01-01"; day < "2026-11-26"; day = addDays(day, 1)) {
    assert.deepEqual(dailyIds(day), legacyDaily(day), day);
  }
});
test("released manifests are frozen independently of future catalog growth", () => {
  assert.equal(CATALOG_RELEASES[0].ids.length, 256);
  assert.equal(CATALOG_RELEASES[1].ids.length, 512);
  assert.ok(Object.isFrozen(CATALOG_RELEASES[1].ids));
  assert.ok(Object.isFrozen(PHRASES));
});
test("all 512 phrases can appear in daily tournaments and daily duels", () => {
  const cups = new Set(),
    duels = new Set();
  for (let day = "2026-11-26"; day < "2036-11-26"; day = addDays(day, 1)) {
    const eight = dailyIds(day),
      pair = duelIds(day);
    assert.equal(new Set(eight).size, 8);
    assert.equal(new Set(pair).size, 2);
    eight.forEach((id) => cups.add(id));
    pair.forEach((id) => duels.add(id));
  }
  assert.equal(cups.size, 512);
  assert.equal(duels.size, 512);
});
test("legacy approved IDs never overlap built-ins", () => {
  assert.equal(submissionPhraseId(1), 256);
  assert.equal(submissionPhraseId(999999), 1000254);
  for (const bad of [0, -1, 1000000, 1.5, "1", NaN, Infinity])
    assert.equal(submissionPhraseId(bad), null);
  assert.equal(
    BUILTIN_IDS.filter((id) => id >= 256 && id <= 1000254).length,
    0,
  );
});
test("strict Gregorian dates, JST midnight, Monday weeks, month and year boundaries", () => {
  assert.equal(validDay("2024-02-29"), true);
  assert.equal(validDay("2026-02-29"), false);
  for (const bad of [
    "2026-02-30",
    "2026-13-01",
    "2026-2-01",
    "2026-01-01x",
    "",
    null,
  ])
    assert.equal(validDay(bad), false);
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(jstDay("2026-12-31T14:59:59Z"), "2026-12-31");
  assert.equal(jstDay("2026-12-31T15:00:00Z"), "2027-01-01");
  assert.equal(weekStart("2027-01-03"), "2026-12-28");
  assert.equal(weekStart("2027-01-04"), "2027-01-04");
  assert.throws(() => dailyIds("2026-02-30"));
  assert.throws(() => duelIds("bad"));
});
