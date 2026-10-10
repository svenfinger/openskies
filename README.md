# 🔵 OpenSkies

Free sky photos at [openskies.photos](https://openskies.photos). Static site built with [Astro](https://astro.build). Images are served from Cloudflare R2 via CDN.

Photo downloads are governed by the [license on the website](https://openskies.photos/license). This repository’s source code is under the [MIT License](LICENSE.md).

## Development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Run `pnpm check` for TypeScript checks and `pnpm build` to verify all static pages.
The gallery and download controls use purpose-built React components with native
HTML dialogs and disclosure elements. Shared navigation and document pages are
static Astro components.

The Field Notes visual system uses self-hosted Instrument Serif and Public Sans,
with shared light/dark design tokens in `src/styles/global.css`. Gallery rows
respect each photograph’s proportions and preserve newest-first reading order.

## Deployment

The site is a Cloudflare Worker with static assets. After `pnpm build`, deploy with `pnpm deploy`.

Production downloads (`/download/...`) are handled by `src/worker.ts`. Local `pnpm dev` still proxies those URLs to the CDN.

## Photo workflow

1. Add originals to `photos-source/` (gitignored). Supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.tif`, `.tiff`.
2. `pnpm process-photos` — writes `photos-build/{id}/` variants and updates `src/data/photos.json` and `id-map.json`. Skips unchanged sources when outputs already exist. Rebuild everything: `pnpm process-photos -- --force`.
3. Set each photo’s `colorBucket` in `src/data/photos.json` (`orange`, `blue`, `gray`). New photos default to `blue` until you edit the manifest.
   Add a visual description in `src/data/photo-descriptions.ts` for useful image alternative text. The generated manifest keeps dimensions after EXIF orientation.
4. `pnpm upload-r2` — syncs `photos-build/` to R2 (copy `.env.example` → `.env` or `.env.local`). Skips when remote ETag matches local MD5. Flags: `--force` re-upload all; `--dry-run` preview keys (no API calls).

### Photo IDs

- New files get the next numeric ID; existing filenames keep their ID across re-runs.
- IDs **001–999** are zero-padded; **1000+** are unpadded (`1000`, `1001`, …).
