import { useCallback, useEffect, useRef } from 'react';
import { photoUrl } from '../config';
import { photoPath } from '../lib/history';
import {
  getNeighbors,
  photoLabel,
  previewDimensions,
} from '../lib/photos';
import type { Photo } from '../types/photo';
import PhotoDownloads from './PhotoDownloads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SWIPE_THRESHOLD = 48;

interface PhotoModalProps {
  photos: Photo[];
  photoId: string | null;
  onPhotoIdChange: (id: string | null, options?: { fromPopState?: boolean }) => void;
}

export default function PhotoModal({
  photos,
  photoId,
  onPhotoIdChange,
}: PhotoModalProps) {
  const touchStartX = useRef<number | null>(null);
  const skipClickFromSwipe = useRef(false);
  const lastPhotoRef = useRef<Photo | null>(null);
  const photo = photoId ? (photos.find((p) => p.id === photoId) ?? null) : null;
  if (photo) lastPhotoRef.current = photo;
  const displayedPhoto = photo ?? lastPhotoRef.current;
  const open = photo !== null;
  const { prev, next } = displayedPhoto
    ? getNeighbors(photos, displayedPhoto.id)
    : { prev: null, next: null };

  const goTo = useCallback(
    (id: string) => {
      history.replaceState({ photoModal: true }, '', photoPath(id));
      onPhotoIdChange(id);
    },
    [onPhotoIdChange],
  );

  const close = useCallback(() => {
    onPhotoIdChange(null);
  }, [onPhotoIdChange]);

  useEffect(() => {
    if (!photoId) return;

    for (const neighbor of [prev, next]) {
      if (!neighbor) continue;
      const img = new Image();
      img.src = photoUrl(neighbor.id, 'preview.jpg');
    }
  }, [photoId, prev, next]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="menu"], [role="listbox"]',
        )
      ) {
        return;
      }

      // Base UI dialogs stop composite keys (arrows) from bubbling, so listen on capture.
      if (event.key === 'ArrowLeft' && prev) {
        event.preventDefault();
        goTo(prev.id);
      } else if (event.key === 'ArrowRight' && next) {
        event.preventDefault();
        goTo(next.id);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, prev, next, goTo]);

  const goToUnlessSwiped = (id: string) => {
    if (skipClickFromSwipe.current) {
      skipClickFromSwipe.current = false;
      return;
    }
    goTo(id);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    skipClickFromSwipe.current = false;
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX == null || endX == null) return;

    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    skipClickFromSwipe.current = true;
    if (delta < 0 && next) goTo(next.id);
    else if (delta > 0 && prev) goTo(prev.id);
  };

  if (!displayedPhoto) return null;

  const label = photoLabel(displayedPhoto.id);
  const preview = previewDimensions(displayedPhoto);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <DialogContent
        className="flex h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] max-w-[min(1920px,calc(100%-3rem))] flex-col gap-4 overflow-hidden px-6 pt-4 pb-6 sm:max-w-[min(1920px,calc(100%-3rem))]"
        showCloseButton
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <DialogHeader className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 pr-10">
          <DialogTitle>{label}</DialogTitle>
          <PhotoDownloads photoId={displayedPhoto.id} />
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden rounded-xl bg-muted">
          <img
            className="pointer-events-none size-full object-contain touch-pan-y"
            draggable={false}
            src={photoUrl(displayedPhoto.id, 'preview.jpg')}
            alt={label}
            width={preview.width}
            height={preview.height}
            decoding="async"
          />
          {prev ? (
            <button
              type="button"
              className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer touch-manipulation border-0 bg-transparent p-0"
              aria-label={`Previous photo (${photoLabel(prev.id)})`}
              onClick={() => goToUnlessSwiped(prev.id)}
            />
          ) : null}
          {next ? (
            <button
              type="button"
              className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer touch-manipulation border-0 bg-transparent p-0"
              aria-label={`Next photo (${photoLabel(next.id)})`}
              onClick={() => goToUnlessSwiped(next.id)}
            />
          ) : null}
        </div>

        <DialogDescription className="shrink-0 text-center">
          Free to use under the{' '}
          <a href="/license">OpenSkies license</a>.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
