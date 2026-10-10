/** Expand and Return, Dissolve, and Follow and Settle share one quiet vocabulary. */
export const MOTION = {
  ease: 'cubic-bezier(0, 0, 0.58, 1)',
  open: 280,
  close: 220,
  surface: 160,
  fade: 120,
  reduced: 80,
  chrome: 120,
  chromeDelay: 60,
  filter: 150,
  menu: 150,
  swipe: 160,
  settle: 140,
} as const;

export const reducedMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Snapshots are presentation only; never duplicate real controls or identities. */
export function presentationClone<T extends HTMLElement>(element: T): T {
  const clone = element.cloneNode(true) as T;
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  for (const child of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
    child.removeAttribute('id');
    child.removeAttribute('data-gallery-photo');
    child.removeAttribute('data-viewer-photo');
    child.removeAttribute('autofocus');
  }
  const sources = element.matches('img')
    ? [element as unknown as HTMLImageElement]
    : Array.from(element.querySelectorAll('img'));
  const images = clone.matches('img')
    ? [clone as unknown as HTMLImageElement]
    : Array.from(clone.querySelectorAll('img'));
  images.forEach((image, index) => {
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.loading = 'eager';
    image.src = sources[index].currentSrc || sources[index].src;
  });
  return clone;
}
