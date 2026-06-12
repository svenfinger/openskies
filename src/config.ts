export const SITE_NAME = 'OpenSkies';

/** Public CDN for processed photo variants (R2 custom domain). */
export const CDN_BASE = 'https://cdn.openskies.photos';

export function photoUrl(id: string, variant: string): string {
  return `${CDN_BASE}/${id}/${variant}`;
}

/** Same-origin download URL (proxied in dev, Cloudflare Pages Function in production). */
export function photoDownloadUrl(id: string, variant: string): string {
  return `/download/${id}/${variant}`;
}
