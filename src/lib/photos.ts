import type { Photo } from '../types/photo';

/** Display label, e.g. "#001". */
export function photoLabel(id: string): string {
  return `#${id}`;
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
  const width = 600;
  const height = Math.round(width / photo.aspect);
  return { width, height };
}

/** Preview variant is max 1920px wide. */
export function previewDimensions(photo: Photo) {
  const width = Math.min(1920, photo.width);
  const height = Math.round(width / photo.aspect);
  return { width, height };
}

export const DOWNLOAD_SIZES = [
  { label: 'Small', file: '960.jpg', detail: '960px' },
  { label: 'Medium', file: '1920.jpg', detail: '1920px' },
  { label: 'Large', file: '3840.jpg', detail: '3840px' },
] as const;

export const DOWNLOAD_ORIGINAL = {
  label: 'Original',
  file: 'original.jpg',
  detail: 'Full resolution',
} as const;

/** All download variants (static photo pages). */
export const DOWNLOADS = [...DOWNLOAD_SIZES, DOWNLOAD_ORIGINAL] as const;
