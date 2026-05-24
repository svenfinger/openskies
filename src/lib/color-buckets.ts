import type { ColorBucket } from '../types/photo';

/** Swatch colors for the filter UI. */
export const COLOR_BUCKET_SWATCHES: Record<ColorBucket, string> = {
  orange: '#e87830',
  blue: '#4a88c0',
  gray: '#a8aeb4',
};

/** Radix accent colors aligned with each bucket’s swatch (see COLOR_BUCKET_SWATCHES). */
export const COLOR_BUCKET_RADIX_COLORS = {
  orange: 'orange',
  blue: 'blue',
  gray: 'gray',
} as const satisfies Record<ColorBucket, string>;

export const COLOR_BUCKET_ORDER: ColorBucket[] = ['orange', 'blue', 'gray'];

export function formatBucketLabel(bucket: ColorBucket): string {
  return bucket;
}

export function isColorBucket(value: string): value is ColorBucket {
  return value in COLOR_BUCKET_SWATCHES;
}
