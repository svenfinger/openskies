export const SITE_NAME = 'OpenSkies';

/** Public CDN for processed photo variants (R2 custom domain). */
export const CDN_BASE = 'https://cdn.openskies.photos';

export function photoUrl(id: string, variant: string): string {
  return `${CDN_BASE}/${id}/${variant}`;
}
