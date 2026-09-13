#!/usr/bin/env node
/**
 * Sync photos-build/ to Cloudflare R2 (S3-compatible API).
 * Skips objects whose ETag already matches the local file (use --force to re-upload).
 */
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { md5Etag, OUTPUT_FILES } from './lib/cache.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'photos-build');

// .env.local overrides .env (either file is gitignored except .env.example)
dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });

const UPLOAD_CONCURRENCY = 4;

function parseArgs(argv) {
  return {
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
  };
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in .env or .env.local (see .env.example)`);
  }
  return value;
}

function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: requireEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 */
async function getRemoteEtag(client, bucket, key) {
  try {
    const res = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return res.ETag ?? null;
  } catch (err) {
    if (err instanceof NotFound || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {string} filePath
 */
async function uploadFile(client, bucket, key, filePath) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T) => Promise<void>} worker
 */
async function runPool(items, concurrency, worker) {
  let index = 0;
  async function runNext() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runNext()),
  );
}

async function listPhotoIds() {
  let entries;
  try {
    entries = await fs.readdir(BUILD_DIR, { withFileTypes: true });
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return [];
    throw err;
  }

  const ids = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    if (!/^\d+$/.test(id)) continue;
    const dir = path.join(BUILD_DIR, id);
    let complete = true;
    for (const file of OUTPUT_FILES) {
      try {
        await fs.access(path.join(dir, file));
      } catch {
        complete = false;
        break;
      }
    }
    if (complete) ids.push(id);
  }

  return ids.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

/**
 * @param {{ id: string, file: string, localPath: string, key: string }} job
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {boolean} force
 * @param {boolean} dryRun
 */
async function syncObject(job, client, bucket, force, dryRun) {
  const localEtag = await md5Etag(job.localPath);

  if (!force && !dryRun) {
    const remoteEtag = await getRemoteEtag(client, bucket, job.key);
    if (remoteEtag === localEtag) {
      return 'skipped';
    }
  }

  if (dryRun) {
    return 'would-upload';
  }

  await uploadFile(client, bucket, job.key, job.localPath);
  return 'uploaded';
}

async function main() {
  const { force, dryRun } = parseArgs(process.argv.slice(2));
  const bucket = dryRun ? process.env.R2_BUCKET?.trim() || 'openskies-photos' : requireEnv('R2_BUCKET');
  const client = dryRun ? null : createR2Client();

  const ids = await listPhotoIds();
  if (ids.length === 0) {
    console.log('Nothing to upload — run pnpm process-photos first.');
    console.log(`  Expected: ${path.relative(ROOT, BUILD_DIR)}/001/thumb.jpg …`);
    process.exit(0);
  }

  /** @type {{ id: string, file: string, localPath: string, key: string }[]} */
  const jobs = [];
  for (const id of ids) {
    for (const file of OUTPUT_FILES) {
      jobs.push({
        id,
        file,
        localPath: path.join(BUILD_DIR, id, file),
        key: `${id}/${file}`,
      });
    }
  }

  if (dryRun) {
    console.log(`Dry run — ${jobs.length} object(s) across ${ids.length} photo(s)\n`);
  } else if (force) {
    console.log(`Force upload — ${jobs.length} object(s)\n`);
  } else {
    console.log(`Syncing ${jobs.length} object(s) to ${bucket}…\n`);
  }

  let uploaded = 0;
  let skipped = 0;
  let wouldUpload = 0;

  await runPool(jobs, UPLOAD_CONCURRENCY, async (job) => {
    const result = await syncObject(job, /** @type {S3Client} */ (client), bucket, force, dryRun);
    if (result === 'uploaded') {
      uploaded++;
      console.log(`  ↑ ${job.key}`);
    } else if (result === 'skipped') {
      skipped++;
    } else {
      wouldUpload++;
      console.log(`  → ${job.key}`);
    }
  });

  console.log('\nDone.');
  if (dryRun) {
    console.log(`  Would upload: ${wouldUpload} object(s) to ${bucket}`);
  } else {
    console.log(`  Uploaded: ${uploaded} · Skipped (etag match): ${skipped}`);
    console.log(`  CDN: https://cdn.openskies.photos/{id}/thumb.jpg`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
