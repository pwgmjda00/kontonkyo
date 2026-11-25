// Public IDs must be unsigned decimal integers that exist in the loaded catalog.
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
