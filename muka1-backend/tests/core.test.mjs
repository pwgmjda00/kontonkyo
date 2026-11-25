import test from "node:test";
import assert from "node:assert/strict";
import {
  parseIds,
  modeFromQuery,
  validVotes,
  minorityTitle,
  shuffle,
} from "../../muka1-preview/core.js";
import { PHRASE_MAP } from "../../muka1-preview/catalog.js";

const entrants = [0, 20, 130, 255, 1000255, 1000300, 1000400, 1000510];
function play(bits, ids = entrants) {
  let row = [...ids],
    index = 0;
  const choices = [];
  while (row.length > 1) {
    const next = [];
    for (let i = 0; i < row.length; i += 2) {
      const winner = row[i + ((bits >> index) & 1)];
      choices.push(winner);
      next.push(winner);
      index++;
    }
    row = next;
  }
  return choices;
}
test("all 128 seven-match tournament paths preserve selected winners", () => {
  const paths = new Set(),
    champions = new Set();
  for (let bits = 0; bits < 128; bits++) {
    const votes = play(bits);
    paths.add(votes.join(","));
    champions.add(votes[6]);
    assert.equal(validVotes(votes, entrants), true, `path ${bits}`);
    assert.ok(votes.slice(0, 4).includes(votes[4]));
    assert.ok(votes.slice(0, 4).includes(votes[5]));
    assert.ok(votes.slice(4, 6).includes(votes[6]));
    for (let k = 0; k < 7; k++) {
      const bad = [...votes];
      bad[k] = 99999999;
      assert.equal(
        validVotes(bad, entrants),
        false,
        `tampered match ${k} of ${bits}`,
      );
    }
  }
  assert.equal(paths.size, 128);
  assert.equal(champions.size, 8);
});
test("legacy and added shared cups, approved IDs, pairs, and seven choices parse by key", () => {
  const known = new Map(PHRASE_MAP);
  known.set(256, "承認済みの創作例");
  assert.deepEqual(parseIds(entrants.join(","), 8, known), entrants);
  assert.deepEqual(parseIds("0,256", 2, known), [0, 256]);
  assert.deepEqual(parseIds("1000255,1000510", 2, known), [1000255, 1000510]);
  const votes = play(0);
  assert.deepEqual(parseIds(votes.join(","), 7, known, false), votes);
});
test("malformed, duplicate, unknown, negative, exponential and oversized URL IDs fail closed", () => {
  const invalid = [
    null,
    undefined,
    "",
    "0,",
    "0, 1",
    "0,1,",
    "0,,1",
    "0,0",
    "-1,0",
    "0.0,1",
    "1e2,1",
    "NaN,1",
    "Infinity,1",
    "9007199254740992,1",
    "256,1",
    "1000511,1",
    "99999999999999999999999999999999,1",
    "0%2C1",
    "<script>,1",
  ];
  for (const raw of invalid)
    assert.equal(parseIds(raw, 2, PHRASE_MAP), null, String(raw));
  assert.equal(parseIds("0,1,2", 2, PHRASE_MAP), null);
  assert.equal(parseIds("0,1", 8, PHRASE_MAP), null);
  assert.equal(validVotes(play(0).slice(0, 6), entrants), false);
  assert.equal(validVotes(null, entrants), false);
  assert.equal(validVotes(play(0), null), false);
  assert.equal(validVotes(play(0), [0, 1, 2, 3]), false);
  assert.equal(validVotes(play(0), [0, 0, 1, 2, 3, 4, 5, 6]), false);
});
test("UTM and invitation attribution never selects an unintended mode", () => {
  for (const params of [
    "",
    "utm_source=x",
    "utm_campaign=duel&foo=daily",
    "invite=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "title=host&day=2026-11-26",
    "pair=0,1",
  ]) {
    assert.equal(modeFromQuery(new URLSearchParams(params)), "nation", params);
  }
  for (const [raw, mode] of [
    ["duel=1", "duel"],
    ["daily=1", "cup"],
    ["random=1", "cup"],
    ["cup=0,1,2,3,4,5,6,7", "cup"],
    ["gacha=1", "gacha"],
    ["host=1", "host"],
    ["challenge=1", "challenge"],
    ["festival=2026-11", "festival"],
  ]) {
    assert.equal(
      modeFromQuery(
        new URLSearchParams(raw + "&utm_source=line&utm_medium=share"),
      ),
      mode,
      raw,
    );
  }
});
test("minority titles use unrounded vote percentages at every boundary", () => {
  assert.equal(minorityTitle(0, 0), "審議中");
  assert.equal(minorityTitle(29, 29), "審議中");
  const cases = [
    [0, "絶滅危惧感性"],
    [100, "絶滅危惧感性"],
    [101, "地下勢力"],
    [250, "地下勢力"],
    [251, "少数派閥"],
    [449, "少数派閥"],
    [450, "国論分裂"],
    [550, "国論分裂"],
    [551, "多数派閥"],
    [749, "多数派閥"],
    [750, "世間の代弁者"],
    [899, "世間の代弁者"],
    [900, "圧倒的民意"],
    [1000, "圧倒的民意"],
  ];
  for (const [n, title] of cases)
    assert.equal(minorityTitle(n, 1000), title, n + " / 1000");
  assert.equal(minorityTitle(3, 30), "絶滅危惧感性");
  assert.equal(minorityTitle(15, 30), "国論分裂");
});
test("random tournament shuffles do not alter the stable input or drop any phrase", () => {
  const input = Array.from(PHRASE_MAP.keys()),
    before = [...input],
    result = shuffle(input);
  assert.deepEqual(input, before);
  assert.notEqual(result, input);
  assert.equal(new Set(result).size, 512);
  assert.deepEqual(
    [...result].sort((a, b) => a - b),
    [...input].sort((a, b) => a - b),
  );
});
