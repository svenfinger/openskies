import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const OUTPUT_FILES = [
  'thumb.jpg',
  'preview.jpg',
  '960.jpg',
  '1920.jpg',
  '3840.jpg',
  'original.jpg',
];

/**
 * @param {string} filePath
 */
export async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

/** S3/R2 ETag for single-part uploads (quoted MD5 hex). */
export async function md5Etag(filePath) {
  const hash = crypto.createHash('md5');
  const data = await fs.readFile(filePath);
  return `"${hash.update(data).digest('hex')}"`;
}

/**
 * @param {string} outDir
 */
export async function hasAllVariants(outDir) {
  for (const file of OUTPUT_FILES) {
    try {
      await fs.access(path.join(outDir, file));
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * @param {Record<string, unknown>} rawIdMap
 * @returns {Record<string, string>}
 */
export function parseFilenameIdMap(rawIdMap) {
  return Object.fromEntries(
    Object.entries(rawIdMap).filter(
      ([key, value]) => !key.startsWith('_') && typeof value === 'string',
    ),
  );
}

/**
 * @param {Record<string, unknown>} rawIdMap
 * @returns {Record<string, string>}
 */
export function parseSourceHashes(rawIdMap) {
  const hashes = rawIdMap._sourceSha256;
  if (!hashes || typeof hashes !== 'object') return {};
  return Object.fromEntries(
    Object.entries(hashes).filter(([, v]) => typeof v === 'string'),
  );
}
