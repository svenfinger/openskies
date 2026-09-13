#!/usr/bin/env node
/**
 * Build-time photo pipeline:
 * - Assign stable numeric IDs (id-map.json)
 * - Generate JPEG variants (photos-build/) — skips unchanged sources unless --force
 * - Write src/data/photos.json (colorBucket defaults to blue; set manually in photos.json)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  hasAllVariants,
  OUTPUT_FILES,
  parseFilenameIdMap,
  parseSourceHashes,
  sha256File,
} from './lib/cache.mjs';
import { formatPhotoId, nextPhotoIdNumber } from './lib/ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'photos-source');
const BUILD_DIR = path.join(ROOT, 'photos-build');
const ID_MAP_PATH = path.join(ROOT, 'src/data/id-map.json');
const PHOTOS_JSON_PATH = path.join(ROOT, 'src/data/photos.json');

/** @type {import('../src/types/photo.js').ColorBucket} */
const DEFAULT_COLOR_BUCKET = 'blue';

const SOURCE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tif',
  '.tiff',
]);

/** @type {{ file: string; width: number; quality: number }[]} */
const JPEG_VARIANTS = [
  { file: 'thumb.jpg', width: 600, quality: 78 },
  { file: 'preview.jpg', width: 1920, quality: 85 },
  { file: '960.jpg', width: 960, quality: 92 },
  { file: '1920.jpg', width: 1920, quality: 92 },
  { file: '3840.jpg', width: 3840, quality: 92 },
];

const JPEG_OPTIONS = { mozjpeg: true, progressive: true };

function parseArgs(argv) {
  return {
    force: argv.includes('--force'),
  };
}

async function loadJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return fallback;
    throw err;
  }
}

async function listSourceFiles() {
  let entries;
  try {
    entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true });
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      await fs.mkdir(SOURCE_DIR, { recursive: true });
      return [];
    }
    throw err;
  }

  return entries
    .filter((e) => e.isFile() && SOURCE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * @param {string} sourcePath
 * @param {string} destPath
 * @param {number} width
 * @param {number} quality
 */
async function writeResizedJpeg(sourcePath, destPath, width, quality) {
  await sharp(sourcePath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, ...JPEG_OPTIONS })
    .toFile(destPath);
}

/**
 * @param {string} sourcePath
 * @param {string} destPath
 */
async function writeOriginal(sourcePath, destPath) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    await fs.copyFile(sourcePath, destPath);
    return;
  }
  await sharp(sourcePath)
    .rotate()
    .jpeg({ quality: 98, ...JPEG_OPTIONS })
    .toFile(destPath);
}

/**
 * @param {string} sourcePath
 */
async function readDimensions(sourcePath) {
  const meta = await sharp(sourcePath).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error('could not read image dimensions');
  }
  return {
    width,
    height,
    aspect: Math.round((width / height) * 1000) / 1000,
  };
}

/**
 * @param {string} sourceName
 * @param {string} sourcePath
 * @param {string} id
 * @param {boolean} force
 * @param {Record<string, string>} sourceHashes
 */
async function processOne(sourceName, sourcePath, id, force, sourceHashes) {
  const outDir = path.join(BUILD_DIR, id);
  const hash = await sha256File(sourcePath);
  const cachedHash = sourceHashes[sourceName];
  const outputsReady = await hasAllVariants(outDir);
  const unchanged = cachedHash === hash && outputsReady;

  if (!force && unchanged) {
    const dims = await readDimensions(sourcePath);
    return {
      id,
      ...dims,
      _skipped: true,
    };
  }

  await fs.mkdir(outDir, { recursive: true });
  const dims = await readDimensions(sourcePath);

  for (const variant of JPEG_VARIANTS) {
    await writeResizedJpeg(
      sourcePath,
      path.join(outDir, variant.file),
      variant.width,
      variant.quality,
    );
  }

  await writeOriginal(sourcePath, path.join(outDir, 'original.jpg'));

  sourceHashes[sourceName] = hash;

  return {
    id,
    ...dims,
    _skipped: false,
  };
}

async function main() {
  const { force } = parseArgs(process.argv.slice(2));
  const sources = await listSourceFiles();

  if (sources.length === 0) {
    console.log('No images in photos-source/ — add originals and run again.');
    console.log(`  ${SOURCE_DIR}`);
    process.exit(0);
  }

  const rawIdMap = await loadJson(ID_MAP_PATH, {});
  const idMap = parseFilenameIdMap(rawIdMap);
  /** @type {Record<string, string>} */
  const sourceHashes = parseSourceHashes(rawIdMap);

  /** @type {import('../src/types/photo.js').Photo[]} */
  const existingPhotos = await loadJson(PHOTOS_JSON_PATH, []);
  const colorById = new Map(
    existingPhotos.map((photo) => [photo.id, photo.colorBucket]),
  );

  /** @type {import('../src/types/photo.js').Photo[]} */
  const photos = [];

  await fs.mkdir(BUILD_DIR, { recursive: true });

  if (force) {
    console.log('Force mode: regenerating all photos.\n');
  }

  console.log(`Processing ${sources.length} photo(s)…\n`);

  let skipped = 0;
  let processed = 0;

  for (const sourceName of sources) {
    const sourcePath = path.join(SOURCE_DIR, sourceName);
    let id = idMap[sourceName];

    if (!id) {
      const num = nextPhotoIdNumber(idMap);
      id = formatPhotoId(num);
      console.log(`  + ${sourceName} → Photo ${id}`);
    } else {
      console.log(`  · ${sourceName} → Photo ${id}`);
    }

    idMap[sourceName] = id;

    const result = await processOne(sourceName, sourcePath, id, force, sourceHashes);

    if (result._skipped) {
      skipped++;
      console.log(`      ↷ skipped (unchanged)`);
    } else {
      processed++;
      console.log(`      ✓ variants written`);
    }

    const { _skipped, ...entry } = result;
    photos.push({
      ...entry,
      colorBucket: colorById.get(id) ?? DEFAULT_COLOR_BUCKET,
    });
  }

  photos.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  const idMapOut = {
    _meta: {
      idFormat:
        'IDs 1–999 use 3-digit zero padding (001). From 1000 onward, no leading zeros (1000, 1001, …). Keys are source filenames.',
      skipPolicy:
        'Skips variant generation when source SHA-256 matches _sourceSha256 and all outputs exist. Use pnpm process-photos -- --force to regenerate.',
    },
    _sourceSha256: Object.fromEntries(
      Object.entries(sourceHashes).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    ),
    ...Object.fromEntries(
      Object.entries(idMap)
        .filter(([k]) => !k.startsWith('_'))
        .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    ),
  };

  await fs.writeFile(ID_MAP_PATH, `${JSON.stringify(idMapOut, null, 2)}\n`);
  await fs.writeFile(PHOTOS_JSON_PATH, `${JSON.stringify(photos, null, 2)}\n`);

  const bucketCounts = photos.reduce((acc, p) => {
    acc[p.colorBucket] = (acc[p.colorBucket] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  console.log('\nDone.');
  console.log(`  Processed: ${processed} · Skipped: ${skipped}`);
  console.log(`  Manifest: ${path.relative(ROOT, PHOTOS_JSON_PATH)} (${photos.length} photos)`);
  console.log(`  Outputs: ${OUTPUT_FILES.join(', ')}`);
  console.log('  Color buckets:', bucketCounts);
  if (processed > 0) {
    console.log('\nNext: pnpm upload-r2');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
