import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  PHRASES,
  PHRASE_MAP,
  BUILTIN_IDS,
  LEGACY_IDS,
  MAX_SUBMISSION_ID,
  dailyIds,
  validDay,
  jstDay,
  addDays,
  weekStart,
  submissionPhraseId,
} from "../../muka1-preview/catalog.js";

// SHA256 of JSON.stringify values extracted from index.html at commit 8487839.
const ORIGINAL_LEGACY_SHA256 =
  "80f6f3f79cf4b6de5e6730f121179458e7c471813f751e04fdbe934939983c64";
const ORIGINAL_EXTRA_SHA256 =
  "306da7ef228914b53bd4f2048e8317dc3c1986eaa8ca288b2b5e57eafce29666";
const ORIGINAL_RECORDS_SHA256 =
  "26eca4c8503e2ea7a0e9ee3d4db2aa738db6514872da367c1cb9ae612fbc7264";
const sha256 = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function originalDaily(day) {
  let seed = Array.from(day).reduce(
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
test("all original 512 IDs and texts match commit 8487839", () => {
  assert.equal(
    sha256(PHRASES.slice(0, 256).map((p) => p.text)),
    ORIGINAL_LEGACY_SHA256,
  );
  assert.equal(
    sha256(PHRASES.slice(256).map((p) => p.text)),
    ORIGINAL_EXTRA_SHA256,
  );
  assert.equal(sha256(PHRASES), ORIGINAL_RECORDS_SHA256);
});
test("512 compact records use stable, unique IDs and a matching Map", () => {
  assert.equal(PHRASES.length, 512);
  assert.equal(PHRASE_MAP.size, 512);
  assert.deepEqual(
    BUILTIN_IDS.slice(0, 256),
    Array.from({ length: 256 }, (_, i) => i),
  );
  assert.deepEqual(
    BUILTIN_IDS.slice(256),
    Array.from({ length: 256 }, (_, i) => 1000255 + i),
  );
  assert.deepEqual(LEGACY_IDS, BUILTIN_IDS.slice(0, 256));
  assert.ok(Object.isFrozen(PHRASES));
  assert.ok(PHRASES.every(Object.isFrozen));
  for (const { id, text } of PHRASES) {
    assert.ok(Number.isSafeInteger(id));
    assert.equal(typeof text, "string");
    assert.ok(text.length >= 5 && text.length <= 140);
    assert.equal(PHRASE_MAP.get(id), text);
  }
});
test("past and future daily candidates retain the original 256-entry algorithm", () => {
  // Cover past, current, and future dates; there is no automatic date cutover.
  for (let day = "2020-01-01"; day < "2037-01-01"; day = addDays(day, 1)) {
    const ids = dailyIds(day);
    assert.deepEqual(ids, originalDaily(day), day);
    assert.equal(new Set(ids).size, 8);
    assert.ok(ids.every((id) => id >= 0 && id <= 255));
  }
});
test("approved-submission public IDs retain their original range and never overlap built-ins", () => {
  assert.equal(MAX_SUBMISSION_ID, 999999);
  assert.equal(submissionPhraseId(1), 256);
  assert.equal(submissionPhraseId(999999), 1000254);
  for (const bad of [0, -1, 1000000, 1.5, "1", null, undefined, NaN, Infinity])
    assert.equal(submissionPhraseId(bad), null);
  assert.equal(
    BUILTIN_IDS.filter((id) => id >= 256 && id <= 1000254).length,
    0,
  );
});
test("strict Gregorian dates reject invalid URL dates", () => {
  for (const day of ["2000-02-29", "2024-02-29", "2026-11-25", "2036-12-31"])
    assert.equal(validDay(day), true);
  for (const day of [
    "1900-02-29",
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-2-01",
    "2026-01-01x",
    "",
    null,
    1,
  ])
    assert.equal(validDay(day), false);
  assert.throws(() => dailyIds("2026-02-30"));
  assert.throws(() => addDays("bad", 1));
  assert.throws(() => addDays("2026-11-25", 1.5));
  assert.throws(() => weekStart(null));
});
test("JST midnight, leap days, Monday weeks, month and year boundaries remain deterministic", () => {
  assert.equal(jstDay("2026-12-31T14:59:59Z"), "2026-12-31");
  assert.equal(jstDay("2026-12-31T15:00:00Z"), "2027-01-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-02-29", 1), "2024-03-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(weekStart("2027-01-03"), "2026-12-28");
  assert.equal(weekStart("2027-01-04"), "2027-01-04");
});
