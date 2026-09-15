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
  const photo = photoId ? (photos.find((p) => p.id === photoId) ?? null) : null;
  const open = photo !== null;
  const { prev, next } = photo ? getNeighbors(photos, photo.id) : { prev: null, next: null };

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
      if (event.key === 'ArrowLeft' && prev) {
        event.preventDefault();
        goTo(prev.id);
      } else if (event.key === 'ArrowRight' && next) {
        event.preventDefault();
        goTo(next.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, prev, next, goTo]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX == null || endX == null) return;

    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    if (delta < 0 && next) goTo(next.id);
    else if (delta > 0 && prev) goTo(prev.id);
  };

  if (!photo) return null;

  const label = photoLabel(photo.id);
  const preview = previewDimensions(photo);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <DialogContent
        className="flex max-h-[min(90dvh,calc(100dvh-2rem))] max-w-[calc(100%-2rem)] flex-col gap-4 overflow-y-auto px-6 pt-4 pb-6 sm:max-w-4xl"
        showCloseButton
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <DialogHeader className="flex-row flex-wrap items-center justify-between gap-3 pr-10">
          <DialogTitle>{label}</DialogTitle>
          <PhotoDownloads photoId={photo.id} />
        </DialogHeader>

        <div className="min-h-0 overflow-hidden rounded-xl bg-muted">
          <img
            className="mx-auto max-h-[min(72dvh,calc(90dvh-9rem))] w-full object-contain touch-pan-y"
            src={photoUrl(photo.id, 'preview.jpg')}
            alt={label}
            width={preview.width}
            height={preview.height}
            decoding="async"
          />
        </div>

        <DialogDescription className="text-center">
          Free to use under the{' '}
          <a href="/license">OpenSkies license</a>.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
