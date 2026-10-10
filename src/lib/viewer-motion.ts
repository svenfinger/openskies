import type { Photo } from '../types/photo';
import { previewDimensions } from './photos';
import { MOTION, presentationClone, reducedMotion } from './motion';
import { viewerSource } from './viewer-images';

type Run = {
  layer: HTMLDivElement;
  stage: HTMLElement;
  abort: AbortController;
  animations: Animation[];
  restore: (() => void)[];
  kind: 'fade' | 'track';
  id: string;
  track?: HTMLDivElement;
  frames: Map<string, number>;
  width: number;
};
type Gesture = {
  pointer: number;
  x: number;
  y: number;
  dx: number;
  base: number;
  horizontal: boolean;
  ignored: boolean;
  reduce: boolean;
  photo: Photo;
  prev: Photo | null;
  next: Photo | null;
};

/** Photograph-only motion. React owns identity, history, and all real controls. */
export function createViewerMotion() {
  let active: Run | null = null;
  let gesture: Gesture | null = null;
  let raf = 0;
  let suppressClick = false;
  let lastBrowse = -Infinity;

  function cancelRun() {
    cancelAnimationFrame(raf);
    raf = 0;
    const run = active;
    active = null;
    if (!run) return;
    run.abort.abort();
    run.animations.forEach((animation) => animation.cancel());
    run.restore.forEach((restore) => restore());
    run.layer.remove();
  }

  function cancel() {
    if (gesture && active?.stage.hasPointerCapture(gesture.pointer)) {
      active.stage.releasePointerCapture(gesture.pointer);
    }
    gesture = null;
    cancelRun();
  }

  function begin(stage: HTMLElement, id: string, kind: Run['kind']) {
    const layer = document.createElement('div');
    layer.className = 'viewer-motion-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    stage.append(layer);
    const run: Run = {
      layer, stage, id, kind, abort: new AbortController(),
      animations: [], restore: [], frames: new Map(), width: stage.clientWidth,
    };
    active = run;
    const options = { passive: true, signal: run.abort.signal };
    window.addEventListener('resize', cancel, options);
    window.visualViewport?.addEventListener('resize', cancel, options);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', cancel, options);
    return run;
  }

  function hide(run: Run, image: HTMLImageElement) {
    const previous = image.style.opacity;
    image.style.opacity = '0';
    run.restore.push(() => { image.style.opacity = previous; });
  }

  function animate(run: Run, element: Element, frames: Keyframe[], duration: number, easing = 'linear') {
    const animation = element.animate(frames, { duration, easing, fill: 'both' });
    run.animations.push(animation);
    return animation;
  }

  function finish(run: Run, animation: Animation) {
    void animation.finished.then(() => {
      if (active === run) cancelRun();
    }, () => {});
  }

  function whenReady(run: Run, image: HTMLImageElement, ready: () => void) {
    if (image.complete && image.naturalWidth) { ready(); return; }
    image.addEventListener('load', ready, { once: true, signal: run.abort.signal });
    image.addEventListener('error', () => {
      if (active === run) cancelRun();
    }, { once: true, signal: run.abort.signal });
  }

  function prepare(stage: HTMLElement | null, id: string, shouldAnimate: boolean) {
    const now = performance.now();
    const rapid = now - lastBrowse < 180;
    lastBrowse = now;
    cancel();
    const image = stage?.querySelector<HTMLImageElement>('[data-viewer-photo]');
    if (!stage || !image || !shouldAnimate || rapid || typeof image.animate !== 'function') return;
    const run = begin(stage, id, 'fade');
    run.layer.append(presentationClone(image));
  }

  /** Called after identity commits, before the browser paints the new photo. */
  function arrive(stage: HTMLElement | null, id: string | null) {
    const run = active;
    if (!run) return;
    if (!id || id !== run.id || stage !== run.stage) { cancel(); return; }
    const image = stage.querySelector<HTMLImageElement>('[data-viewer-photo]');
    if (!image) { cancel(); return; }
    hide(run, image);
    if (run.kind === 'track') return;
    whenReady(run, image, () => {
      if (active !== run) return;
      const duration = reducedMotion() ? MOTION.reduced : MOTION.fade;
      // Dissolve a complete outgoing frame over the new photograph. Two
      // simultaneous alpha fades would darken the image at the midpoint.
      image.style.opacity = '1';
      finish(run, animate(run, run.layer, [{ opacity: 1 }, { opacity: 0 }], duration));
    });
  }

  function offsetOf(id: string) {
    if (!active?.track) return 0;
    const x = new DOMMatrixReadOnly(getComputedStyle(active.track).transform).m41;
    return x + (active.frames.get(id) ?? 0);
  }

  function pointerDown(event: PointerEvent, photo: Photo, prev: Photo | null, next: Photo | null) {
    if (event.pointerType !== 'touch') { suppressClick = false; return; }
    if (!event.isPrimary || gesture) { cancel(); suppressClick = true; return; }
    suppressClick = false;
    gesture = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY, dx: 0,
      base: 0, horizontal: false, ignored: false,
      reduce: reducedMotion() || typeof Element.prototype.animate !== 'function',
      photo, prev, next,
    };
  }

  function makeTrack(stage: HTMLElement, current: Gesture) {
    const live = stage.querySelector<HTMLImageElement>('[data-viewer-photo]');
    if (!live) return null;
    const base = offsetOf(current.photo.id);
    cancelRun();
    current.base = base;
    const run = begin(stage, current.photo.id, 'track');
    const track = document.createElement('div');
    track.className = 'viewer-motion-track';
    run.layer.append(track);
    run.track = track;
    for (const [photo, index] of [[current.prev, -1], [current.photo, 0], [current.next, 1]] as const) {
      if (!photo) continue;
      const image = photo.id === current.photo.id ? presentationClone(live) : new Image();
      if (photo.id !== current.photo.id) {
        const dimensions = previewDimensions(photo);
        image.src = viewerSource(photo.id);
        image.width = dimensions.width;
        image.height = dimensions.height;
        image.alt = '';
      }
      image.style.opacity = '1';
      image.style.transform = `translateX(${index * run.width}px)`;
      track.append(image);
      run.frames.set(photo.id, index * run.width);
    }
    hide(run, live);
    return run;
  }

  function paint(run: Run, current: Gesture) {
    let offset = current.base + current.dx;
    // At collection boundaries there is no invented space or elastic bounce.
    offset = Math.max(current.next ? -run.width : 0, Math.min(current.prev ? run.width : 0, offset));
    run.track!.style.transform = `translateX(${offset}px)`;
  }

  function pointerMove(event: PointerEvent, stage: HTMLElement, beforeTrack: () => void) {
    const current = gesture;
    if (!current || current.pointer !== event.pointerId || current.ignored) return;
    current.dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.horizontal) {
      if (Math.max(Math.abs(current.dx), Math.abs(dy)) < 8) return;
      if (Math.abs(current.dx) <= Math.abs(dy) * 1.2) {
        current.ignored = true;
        return;
      }
      current.horizontal = true;
      suppressClick = true;
      beforeTrack();
      stage.setPointerCapture(event.pointerId);
      if (!current.reduce) makeTrack(stage, current);
    }
    if (current.reduce) return;
    if (active?.track && !raf) raf = requestAnimationFrame(() => {
      raf = 0;
      if (active?.track && gesture === current) paint(active, current);
    });
  }

  function pointerEnd(event: PointerEvent, stage: HTMLElement, commit: (id: string) => void, canceled = false) {
    const current = gesture;
    if (!current || current.pointer !== event.pointerId) return;
    gesture = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!current.horizontal || current.ignored) return;
    if (!canceled) current.dx = event.clientX - current.x;
    cancelAnimationFrame(raf);
    raf = 0;
    const destination = !canceled && Math.abs(current.dx) >= 48
      ? (current.dx < 0 ? current.next : current.prev) : null;
    if (current.reduce) {
      if (destination) { prepare(stage, destination.id, true); commit(destination.id); }
      return;
    }
    const run = active;
    if (!run?.track) return;
    paint(run, current);
    const from = run.track.style.transform;
    const target = destination ? -(run.frames.get(destination.id) ?? 0) : 0;
    if (destination) {
      run.id = destination.id;
      commit(destination.id);
    }
    const movement = animate(run, run.track,
      [{ transform: from }, { transform: `translateX(${target}px)` }],
      destination ? MOTION.swipe : MOTION.settle, MOTION.ease);
    // Identity commits now; the gesture's presentation settles independently.
    void movement.finished.then(() => {
      if (active !== run || gesture?.horizontal) return;
      const live = stage.querySelector<HTMLImageElement>('[data-viewer-photo]');
      if (live) whenReady(run, live, () => { if (active === run) cancelRun(); });
      else cancelRun();
    }, () => {});
  }

  return {
    prepare, arrive, cancel, pointerDown, pointerMove, pointerEnd,
    freezeForClose() {
      const run = active;
      if (!run) return false;
      // A half-swiped or dissolving photo has no single full-image origin.
      // Freeze exactly what is visible for the dialog's brief exit dissolve.
      run.layer.style.opacity = getComputedStyle(run.layer).opacity;
      if (run.track) run.track.style.transform = getComputedStyle(run.track).transform;
      run.animations.forEach((animation) => animation.cancel());
      return true;
    },
    consumeClick() {
      if (!suppressClick) return false;
      suppressClick = false;
      return true;
    },
  };
}
