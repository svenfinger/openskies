import type { Photo } from '../types/photo';
import { photoDescriptions } from '../data/photo-descriptions';

/** Display label, e.g. "#001". */
export function photoLabel(id: string): string {
  return `#${id}`;
}

export function photoDescription(photo: Photo): string {
  return (
    photoDescriptions[photo.id] ??
    `A ${photo.colorBucket} sky, photograph ${photoLabel(photo.id)}.`
  );
}

export function resizedDimensions(photo: Photo, maxWidth: number) {
  const width = Math.min(maxWidth, photo.width);
  return { width, height: Math.round((width * photo.height) / photo.width) };
}

/** Stable reading order; mixed orientations form pairs, similar ones form trios. */
export function galleryComposition(photos: Photo[]) {
  const result: { photo: Photo; fraction: number; gaps: number }[] = [];
  for (let start = 0; start < photos.length;) {
    const first = photos[start];
    const second = photos[start + 1];
    const mixed =
      second && first.width < first.height !== second.width < second.height;
    const row = photos.slice(start, start + (mixed ? 2 : 3));
    const total = row.reduce((sum, p) => sum + p.width / p.height, 0);
    row.forEach((photo) =>
      result.push({
        photo,
        fraction: photo.width / photo.height / total,
        gaps: row.length - 1,
      }),
    );
    start += row.length;
  }
  return result;
}

export function sortPhotosById(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
}

/** Neighbors follow the order of `photos` (e.g. newest-first on the gallery). */
export function getNeighbors(photos: Photo[], id: string) {
  const index = photos.findIndex((p) => p.id === id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? photos[index - 1] : null,
    next: index < photos.length - 1 ? photos[index + 1] : null,
  };
}

/** Intrinsic thumb dimensions for layout (thumb variant is max 600px wide). */
export function thumbDimensions(photo: Photo) {
  return resizedDimensions(photo, 600);
}

/** Preview variant is max 1920px wide. */
export function previewDimensions(photo: Photo) {
  return resizedDimensions(photo, 1920);
}

export const DOWNLOAD_SIZES = [
  { label: 'Small', file: '960.jpg', width: 960 },
  { label: 'Medium', file: '1920.jpg', width: 1920 },
  { label: 'Large', file: '3840.jpg', width: 3840 },
] as const;

export const DOWNLOAD_ORIGINAL = {
  label: 'Original',
  file: 'original.jpg',
  detail: 'Full resolution',
} as const;

/** All download variants (static photo pages). */
export const DOWNLOADS = [...DOWNLOAD_SIZES, DOWNLOAD_ORIGINAL] as const;
