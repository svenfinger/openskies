import { photoUrl } from '../config';
import { galleryImage } from './photo-transition';

const decoded = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export function viewerSource(id: string) {
  if (typeof document === 'undefined') return photoUrl(id, 'thumb.jpg');
  const thumbnail = galleryImage(id);
  return decoded.get(id) ||
    (thumbnail?.complete && thumbnail.naturalWidth ? thumbnail.currentSrc : '') ||
    photoUrl(id, 'thumb.jpg');
}

/** Share decode work between the live photo and the two neighboring swipe frames. */
export function decodePreview(id: string): Promise<string | null> {
  if (decoded.has(id)) return Promise.resolve(decoded.get(id)!);
  const existing = pending.get(id);
  if (existing) return existing;
  const image = new Image();
  image.src = photoUrl(id, 'preview.jpg');
  const promise = image.decode().then(() => {
    decoded.set(id, image.src);
    return image.src;
  }, () => null).finally(() => pending.delete(id));
  pending.set(id, promise);
  return promise;
}
