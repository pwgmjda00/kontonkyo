// URL IDs are stable public identifiers, never array positions.
export function parseIds(value, count, known, unique = true) {
  if (typeof value !== "string" || !/^\d+(,\d+)*$/.test(value)) return null;
  const ids = value.split(",").map(Number);
  if (
    ids.length !== count ||
    ids.some((id) => !Number.isSafeInteger(id) || !known.has(id))
  )
    return null;
  return unique && new Set(ids).size !== count ? null : ids;
}
export function modeFromQuery(q) {
  for (const mode of [
    "gacha",
    "challenge",
    "host",
    "nation",
    "duel",
    "daily",
    "cup",
    "random",
    "festival",
  ]) {
    if (q.has(mode))
      return mode === "random" || mode === "daily" ? "cup" : mode;
  }
  return "nation";
}
export function validVotes(p, ids) {
  if (
    !Array.isArray(p) ||
    p.length !== 7 ||
    !Array.isArray(ids) ||
    ids.length !== 8 ||
    new Set(ids).size !== 8
  )
    return false;
  let row = ids.slice(),
    k = 0;
  while (row.length > 1) {
    const next = [];
    for (let i = 0; i < row.length; i += 2) {
      const v = p[k++];
      if (v !== row[i] && v !== row[i + 1]) return false;
      next.push(v);
    }
    row = next;
  }
  return true;
}
export function minorityTitle(votes, total) {
  if (total < 30) return "審議中";
  // Compare integer products so exactly 55% does not become 55.00000000000001.
  const p = votes * 100;
  if (p <= total * 10) return "絶滅危惧感性";
  if (p <= total * 25) return "地下勢力";
  if (p < total * 45) return "少数派閥";
  if (p <= total * 55) return "国論分裂";
  if (p < total * 75) return "多数派閥";
  if (p < total * 90) return "世間の代弁者";
  return "圧倒的民意";
}
export function shuffle(ids) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
