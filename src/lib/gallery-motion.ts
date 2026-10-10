import { MOTION, presentationClone, reducedMotion } from './motion';

export function createGalleryMotion() {
  let layer: HTMLElement | null = null;
  let animations: Animation[] = [];
  let abort: AbortController | null = null;
  let prepared = false;
  let restore: (() => void) | null = null;

  function cancel() {
    abort?.abort();
    abort = null;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    restore?.();
    restore = null;
    layer?.remove();
    layer = null;
    prepared = false;
  }

  function prepare(collection: HTMLElement | null, animate: boolean) {
    const interrupted = prepared;
    cancel();
    // Repeated choices commit the latest composition instead of stacking ghosts
    // or retaining an obsolete choice while its images are loading.
    if (!animate || interrupted || !collection || typeof collection.animate !== 'function') return;
    const snapshot = document.createElement('ul');
    snapshot.className = 'photo-grid gallery-motion-overlay';
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.inert = true;
    snapshot.style.opacity = '1';
    const items = collection.tagName === 'UL' ? collection.children : [collection];
    for (const item of items) {
      if (!(item instanceof HTMLElement)) continue;
      const rect = item.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) continue;
      const clone = presentationClone(item);
      Object.assign(clone.style, {
        position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
      });
      snapshot.append(clone);
    }
    document.body.append(snapshot);
    layer = snapshot;
    prepared = true;
    abort = new AbortController();
    const options = { passive: true, signal: abort.signal };
    const origin = { x: scrollX, y: scrollY };
    window.addEventListener('resize', cancel, options);
    window.addEventListener('scroll', () => {
      if (scrollX !== origin.x || scrollY !== origin.y) cancel();
    }, options);
    window.visualViewport?.addEventListener('resize', cancel, options);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', cancel, options);
  }

  function arrive(collection: HTMLElement | null) {
    if (!prepared || !layer) return;
    if (!collection) { cancel(); return; }
    const snapshot = layer;
    const duration = reducedMotion() ? MOTION.reduced : MOTION.filter;
    const previousOpacity = collection.style.opacity;
    collection.style.opacity = '0';
    restore = () => { collection.style.opacity = previousOpacity; };
    const images = Array.from(collection.querySelectorAll('img')).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    });
    const waiting = images.filter((image) => !image.complete);
    let remaining = waiting.length;
    const dissolve = () => {
      if (layer !== snapshot) return;
      animations.push(snapshot.animate([{ opacity: snapshot.style.opacity }, { opacity: 0 }],
        { duration, easing: 'linear', fill: 'both' }));
      const incoming = collection.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration, easing: 'linear', fill: 'both' });
      animations.push(incoming);
      void incoming.finished.then(() => { if (layer === snapshot) cancel(); }, () => {});
    };
    // Only the visible composition waits for pixels. Selection, layout, hit
    // targets, count, and browser history have already committed.
    if (!remaining) dissolve();
    for (const image of waiting) {
      const ready = () => { if (--remaining === 0) dissolve(); };
      image.addEventListener('load', ready, { once: true, signal: abort!.signal });
      image.addEventListener('error', ready, { once: true, signal: abort!.signal });
    }
  }

  return { prepare, arrive, cancel };
}
