/** The photo's visual journey is independent of the native dialog lifecycle. */
import { MOTION } from './motion';

type Bounds = { left: number; top: number; width: number; height: number };

export function galleryImage(id: string) {
  return document.querySelector<HTMLImageElement>(
    `[data-gallery-photo="${CSS.escape(id)}"]`,
  );
}

/** The pixels inside object-fit: contain, rather than the image element's box. */
function containedImageBounds(
  box: Bounds,
  width: number,
  height: number,
): Bounds {
  const scale = Math.min(box.width / width, box.height / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    left: box.left + (box.width - fittedWidth) / 2,
    top: box.top + (box.height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}

function visibleThumbnail(image: HTMLImageElement | null) {
  if (!image?.isConnected || !image.complete || !image.naturalWidth) return null;
  const box = image.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  // A partly clipped source cannot travel as a complete photograph without a jump.
  if (
    box.width <= 0 || box.height <= 0 ||
    box.left < left - 1 || box.top < top - 1 ||
    box.right > left + (viewport?.width ?? innerWidth) + 1 ||
    box.bottom > top + (viewport?.height ?? innerHeight) + 1
  ) return null;
  return box;
}

function place(element: HTMLElement, bounds: Bounds) {
  Object.assign(element.style, {
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
  });
}

function transform(from: Bounds, to: Bounds) {
  // Uniform scale preserves the photograph even when JPEG dimensions round by a pixel.
  const scale = from.width / to.width;
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`;
}

function viewerBounds(image: HTMLImageElement) {
  return containedImageBounds(
    image.getBoundingClientRect(),
    Number(image.getAttribute('width')),
    Number(image.getAttribute('height')),
  );
}

interface Journey {
  id: string;
  dialog: HTMLDialogElement;
  animations: Animation[];
  restore: (() => void)[];
  abort: AbortController;
  layer?: HTMLDivElement;
  proxy?: HTMLImageElement;
  surface?: HTMLElement;
}

export function createPhotoTransition() {
  let active: Journey | null = null;

  function cancel() {
    const journey = active;
    if (!journey) return;
    active = null;
    journey.abort.abort();
    journey.animations.forEach((animation) => animation.cancel());
    journey.restore.forEach((restore) => restore());
    journey.layer?.remove();
    delete journey.dialog.dataset.photoOpening;
    journey.dialog.style.removeProperty('--photo-backdrop-from');
    journey.dialog.style.removeProperty('--photo-backdrop-duration');
  }

  function begin(dialog: HTMLDialogElement, id: string): Journey {
    const journey: Journey = {
      id,
      dialog,
      animations: [],
      restore: [],
      abort: new AbortController(),
    };
    active = journey;
    const options = { signal: journey.abort.signal, passive: true };
    const origin = { x: scrollX, y: scrollY };
    // Geometry has become stale: settle immediately, never chase a moving target.
    window.addEventListener('resize', cancel, options);
    window.addEventListener('scroll', () => {
      // A scroll event queued before the click (or focus restoration) can arrive
      // after showModal. Only abandon a journey if its actual geometry changed.
      if (scrollX !== origin.x || scrollY !== origin.y) cancel();
    }, options);
    window.visualViewport?.addEventListener('resize', cancel, options);
    window.visualViewport?.addEventListener('scroll', cancel, options);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', cancel, options);
    return journey;
  }

  function hide(journey: Journey, element: HTMLElement) {
    const previous = element.style.opacity;
    // Opacity keeps the real image in the accessibility tree and its link usable.
    element.style.opacity = '0';
    journey.restore.push(() => { element.style.opacity = previous; });
  }

  function animate(
    journey: Journey,
    element: Element,
    frames: Keyframe[],
    duration: number,
    easing: string = MOTION.ease,
    delay = 0,
  ) {
    const animation = element.animate(frames, {
      duration, easing, delay, fill: 'both',
    });
    journey.animations.push(animation);
    return animation;
  }

  function finishWith(journey: Journey, animation: Animation) {
    void animation.finished.then(
      () => {
        if (active === journey) cancel();
      },
      () => { /* Cancellation is an ordinary interaction, not an error. */ },
    );
  }

  function layerFor(journey: Journey) {
    const layer = document.createElement('div');
    layer.className = 'photo-motion-layer';
    layer.popover = 'manual';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    document.body.append(layer);
    // A manual, noninteractive popover clears the native dialog's top layer.
    // It owns no focus, modality, dismissal, or history.
    layer.showPopover();
    journey.layer = layer;
    return layer;
  }

  function imageProxy(journey: Journey, src: string, bounds: Bounds) {
    const image = new Image();
    image.className = 'photo-motion-image';
    image.alt = '';
    image.src = src;
    place(image, bounds);
    journey.layer!.append(image);
    journey.proxy = image;
    return image;
  }

  function open(dialog: HTMLDialogElement, shouldAnimate: boolean) {
    const image = dialog.querySelector<HTMLImageElement>('[data-viewer-photo]');
    const id = image?.dataset.viewerPhoto;
    const interrupted = active?.id === id ? active : null;
    const from = interrupted?.proxy?.getBoundingClientRect();
    const previousSrc = interrupted?.proxy?.src;
    const previousOpacity = interrupted?.surface
      ? Number(getComputedStyle(interrupted.surface).opacity) : 0;
    const previousChrome = interrupted?.surface
      ? Array.from(interrupted.surface.querySelectorAll('.viewer-header, .viewer-footer'),
          (element) => Number(getComputedStyle(element).opacity))
      : [];
    cancel();
    if (!image || !id || !shouldAnimate || typeof image.animate !== 'function') return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const thumbnail = galleryImage(id);
    const source = from ?? visibleThumbnail(thumbnail);
    const shared = !reduce && source && typeof dialog.showPopover === 'function';
    const journey = begin(dialog, id);
    const duration = reduce ? MOTION.reduced : shared ? MOTION.surface : MOTION.fade;
    dialog.style.setProperty('--photo-backdrop-from', String(previousOpacity));
    dialog.style.setProperty('--photo-backdrop-duration', `${duration}ms`);
    dialog.dataset.photoOpening = '';
    const surface = animate(journey, dialog,
      [{ opacity: previousOpacity }, { opacity: 1 }], duration, 'linear');

    if (!shared) {
      finishWith(journey, surface);
      return;
    }

    const target = viewerBounds(image);
    layerFor(journey);
    const proxy = imageProxy(journey, previousSrc || thumbnail!.currentSrc, target);
    hide(journey, image);
    if (thumbnail) hide(journey, thumbnail);
    dialog.querySelectorAll('.viewer-header, .viewer-footer').forEach((chrome, index) => {
      animate(journey, chrome, [{ opacity: previousChrome[index] ?? 0 }, { opacity: 1 }],
        MOTION.chrome, 'linear', interrupted ? 0 : MOTION.chromeDelay);
    });
    const movement = animate(journey, proxy,
      [{ transform: transform(source, target) }, { transform: 'none' }], MOTION.open);
    finishWith(journey, movement);
  }

  function close(dialog: HTMLDialogElement, shouldAnimate: boolean, allowShared = true) {
    const image = dialog.querySelector<HTMLImageElement>('[data-viewer-photo]');
    const id = image?.dataset.viewerPhoto;
    const from = active && active.id === id ? active.proxy?.getBoundingClientRect() : undefined;
    const src = active && active.id === id ? active.proxy?.src : undefined;
    const opacity = Number(getComputedStyle(dialog).opacity);
    const backdropOpacity = Number(getComputedStyle(dialog, '::backdrop').opacity);
    const chromeOpacity = Array.from(dialog.querySelectorAll('.viewer-header, .viewer-footer'),
      (element) => getComputedStyle(element).opacity);
    cancel();
    if (!image || !id || !shouldAnimate || !dialog.isConnected ||
      typeof dialog.showPopover !== 'function' || typeof image.animate !== 'function') return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const thumbnail = galleryImage(id);
    const target = visibleThumbnail(thumbnail);
    const shared = allowShared && !reduce && target && (src || (image.complete && image.naturalWidth));
    const source = from ?? viewerBounds(image);
    const journey = begin(dialog, id);
    const layer = layerFor(journey);
    const backdrop = document.createElement('div');
    backdrop.className = 'photo-motion-backdrop';
    layer.append(backdrop);

    // Snapshot only the exiting presentation. The real dialog closes now, not
    // after an animation timer, so focus and every gallery link work immediately.
    const surface = document.createElement('div');
    surface.className = 'photo-modal photo-motion-surface';
    surface.setAttribute('open', '');
    for (const child of dialog.children) surface.append(child.cloneNode(true));
    const menu = dialog.querySelector<HTMLElement>('.download-list');
    const exitingMenu = surface.querySelector<HTMLElement>('.download-list');
    if (menu && exitingMenu) {
      const style = getComputedStyle(menu);
      exitingMenu.style.opacity = style.opacity;
      exitingMenu.style.transform = style.transform;
    }
    surface.querySelectorAll<HTMLElement>('.viewer-header, .viewer-footer').forEach((chrome, index) => {
      chrome.style.opacity = chromeOpacity[index];
    });
    for (const element of surface.querySelectorAll('[id], [data-viewer-photo]')) {
      element.removeAttribute('id');
      element.removeAttribute('data-viewer-photo');
    }
    place(surface, dialog.getBoundingClientRect());
    layer.append(surface);
    journey.surface = surface;
    const duration = reduce ? MOTION.reduced : MOTION.fade;
    animate(journey, backdrop, [{ opacity: backdropOpacity }, { opacity: 0 }], duration, 'linear');
    const fading = animate(journey, surface, [{ opacity }, { opacity: 0 }], duration, 'linear');

    if (!shared) {
      finishWith(journey, fading);
      return;
    }

    surface.querySelector<HTMLElement>('.viewer-stage img')!.style.visibility = 'hidden';
    hide(journey, thumbnail!);
    const proxy = imageProxy(journey, src || image.currentSrc, target);
    const movement = animate(journey, proxy,
      [{ transform: transform(source, target) }, { transform: 'none' }], MOTION.close);
    finishWith(journey, movement);
  }

  return {
    open, close, cancel,
    photoChanged(id: string | null) {
      if (id && active && active.id !== id) cancel();
    },
  };
}
