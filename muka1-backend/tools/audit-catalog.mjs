import { PHRASES } from "../../muka1-preview/catalog.js";
const normalize = (s) => s.normalize("NFKC").replace(/[\p{P}\p{S}\s]/gu, "");
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = next;
  }
  return previous[b.length];
}
const exact = [],
  normalized = [],
  similar = [];
for (let i = 0; i < PHRASES.length; i++)
  for (let j = i + 1; j < PHRASES.length; j++) {
    const a = PHRASES[i],
      b = PHRASES[j];
    if (a.text === b.text) exact.push([a.id, b.id]);
    const x = normalize(a.text),
      y = normalize(b.text);
    if (x === y) normalized.push([a.id, b.id]);
    const score = 1 - distance(x, y) / Math.max(x.length, y.length);
    if (score >= 0.65 && x !== y)
      similar.push({
        ids: [a.id, b.id],
        score: Number(score.toFixed(3)),
        texts: [a.text, b.text],
      });
  }
// Findings are reported for editorial review. This audit never rewrites phrases
// and duplicate findings do not make the command fail.
console.log(
  JSON.stringify(
    {
      count: PHRASES.length,
      comparedPairs: (PHRASES.length * (PHRASES.length - 1)) / 2,
      exact,
      normalized,
      similar,
    },
    null,
    2,
  ),
);
