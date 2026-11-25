import { PHRASES, PHRASE_MAP } from "../../muka1-preview/catalog.js";
const normalized = (s) => s.normalize("NFKC").replace(/[\p{P}\p{S}\s]/gu, "");
function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    prev = next;
  }
  return prev[b.length];
}
const exact = [],
  punctuation = [],
  similar = [];
for (let i = 0; i < PHRASES.length; i++)
  for (let j = i + 1; j < PHRASES.length; j++) {
    const a = PHRASES[i],
      b = PHRASES[j];
    if (a.text === b.text) exact.push([a.id, b.id]);
    const x = normalized(a.text),
      y = normalized(b.text);
    if (x === y) punctuation.push([a.id, b.id]);
    const score = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
    if (score >= 0.65)
      similar.push({
        a: a.id,
        b: b.id,
        score: Number(score.toFixed(3)),
        texts: [a.text, b.text],
      });
  }
console.log(
  JSON.stringify(
    {
      count: PHRASES.length,
      uniqueIds: PHRASE_MAP.size,
      exact,
      punctuation,
      similar,
    },
    null,
    2,
  ),
);
if (exact.length || punctuation.length || PHRASES.length !== PHRASE_MAP.size)
  process.exitCode = 1;
