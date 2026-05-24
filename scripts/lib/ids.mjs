/**
 * Photo IDs: zero-padded to 3 digits for 1–999, then unpadded (1000, 1001, …).
 */

/** @param {number} n */
export function formatPhotoId(n) {
  if (n < 1) throw new RangeError(`Invalid photo id number: ${n}`);
  if (n < 1000) return String(n).padStart(3, '0');
  return String(n);
}

/**
 * @param {Record<string, string>} idMap filename → id
 * @returns {number} next available numeric id
 */
export function nextPhotoIdNumber(idMap) {
  let max = 0;
  for (const [key, id] of Object.entries(idMap)) {
    if (key.startsWith('_') || typeof id !== 'string') continue;
    const n = parseInt(id, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
}
