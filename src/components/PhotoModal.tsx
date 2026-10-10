import { useCallback, useEffect, useId, useRef } from 'react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { photoUrl } from '../config';
import { photoPath } from '../lib/history';
import {
  getNeighbors,
  photoLabel,
  photoDescription,
  previewDimensions,
} from '../lib/photos';
import type { Photo } from '../types/photo';
import PhotoDownloads from './PhotoDownloads';
import Modal from './Modal';

const SWIPE_THRESHOLD = 48;

interface PhotoModalProps {
  photos: Photo[];
  photoId: string | null;
  onPhotoIdChange: (
    id: string | null,
    options?: { fromPopState?: boolean },
  ) => void;
}

export default function PhotoModal({
  photos,
  photoId,
  onPhotoIdChange,
}: PhotoModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
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
          'input, textarea, select, [contenteditable="true"], [role="menu"], [role="listbox"], details[open]',
        )
      ) {
        return;
      }

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

  const goToUnlessSwiped = (id: string) => {
    if (skipClickFromSwipe.current) {
      skipClickFromSwipe.current = false;
      return;
    }
    goTo(id);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    skipClickFromSwipe.current = false;
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    const end = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !end) return;

    const delta = end.clientX - start.x;
    if (
      Math.abs(delta) < SWIPE_THRESHOLD ||
      Math.abs(delta) < Math.abs(end.clientY - start.y) * 1.2
    )
      return;

    skipClickFromSwipe.current = true;
    if (delta < 0 && next) goTo(next.id);
    else if (delta > 0 && prev) goTo(prev.id);
  };

  if (!displayedPhoto) return null;

  const label = photoLabel(displayedPhoto.id);
  const preview = previewDimensions(displayedPhoto);

  return (
    <Modal
      open={open}
      onDismiss={close}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="photo-modal"
    >
      <div className="viewer-header">
        <div className="viewer-title">
          <h2 id={titleId}>{label}</h2>
          <span className="small-text">
            {displayedPhoto.width} × {displayedPhoto.height}
          </span>
        </div>
        <div className="viewer-actions">
          <PhotoDownloads photo={displayedPhoto} />
          <button
            type="button"
            className="site-icon-button"
            aria-label="Close photograph"
            onClick={close}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div
        className="viewer-stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        <img
          draggable={false}
          src={photoUrl(displayedPhoto.id, 'preview.jpg')}
          alt={photoDescription(displayedPhoto)}
          width={preview.width}
          height={preview.height}
          decoding="async"
        />
        {prev ? (
          <button
            type="button"
            className="viewer-step viewer-step-prev"
            aria-label={`Previous photo (${photoLabel(prev.id)})`}
            onClick={() => goToUnlessSwiped(prev.id)}
          >
            <span aria-hidden="true">←</span>
          </button>
        ) : null}
        {next ? (
          <button
            type="button"
            className="viewer-step viewer-step-next"
            aria-label={`Next photo (${photoLabel(next.id)})`}
            onClick={() => goToUnlessSwiped(next.id)}
          >
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>

      <div className="viewer-footer">
        <p id={descriptionId}>
          Free to use under the <a href="/license">OpenSkies license</a>.
        </p>
        <span className="viewer-index">
          {String(
            photos.findIndex((p) => p.id === displayedPhoto.id) + 1,
          ).padStart(2, '0')}{' '}
          / {String(photos.length).padStart(2, '0')}
        </span>
      </div>
    </Modal>
  );
}
