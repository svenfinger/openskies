import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { createPhotoTransition } from '../lib/photo-transition';
import { createViewerMotion } from '../lib/viewer-motion';
import { decodePreview, viewerSource } from '../lib/viewer-images';

interface PhotoModalProps {
  photos: Photo[];
  photoId: string | null;
  animateOpen: boolean;
  onPhotoIdChange: (
    id: string | null,
    options?: { fromPopState?: boolean },
  ) => void;
}

export default function PhotoModal({
  photos,
  photoId,
  animateOpen,
  onPhotoIdChange,
}: PhotoModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [transition] = useState(createPhotoTransition);
  const animateDismiss = useRef(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [browsing] = useState(createViewerMotion);
  const lastPhotoRef = useRef<Photo | null>(null);
  const photo = photoId ? (photos.find((p) => p.id === photoId) ?? null) : null;
  if (photo) lastPhotoRef.current = photo;
  const displayedPhoto = photo ?? lastPhotoRef.current;
  const open = photo !== null;
  const { prev, next } = displayedPhoto
    ? getNeighbors(photos, displayedPhoto.id)
    : { prev: null, next: null };

  const commitPhoto = useCallback(
    (id: string) => {
      history.replaceState({ photoModal: true }, '', photoPath(id));
      onPhotoIdChange(id);
    },
    [onPhotoIdChange],
  );

  const goTo = useCallback((id: string, animate = false) => {
    transition.cancel();
    browsing.prepare(stageRef.current, id, animate);
    commitPhoto(id);
  }, [transition, browsing, commitPhoto]);

  const close = useCallback(
    (animate = true) => {
      animateDismiss.current = animate;
      onPhotoIdChange(null);
    },
    [onPhotoIdChange],
  );

  useLayoutEffect(() => {
    transition.photoChanged(photoId);
    browsing.arrive(stageRef.current, photoId);
  }, [photoId, transition, browsing]);

  // The gallery is usable immediately on close, including its color filters.
  useLayoutEffect(() => transition.cancel(), [photos, transition]);

  useEffect(() => () => {
    transition.cancel();
    browsing.cancel();
  }, [transition, browsing]);

  useEffect(() => {
    if (!photoId) return;

    for (const neighbor of [prev, next]) {
      if (!neighbor) continue;
      void decodePreview(neighbor.id);
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

  if (!displayedPhoto) return null;

  const label = photoLabel(displayedPhoto.id);

  return (
    <Modal
      open={open}
      onDismiss={close}
      transition={{
        open: (dialog) => {
          animateDismiss.current = true;
          transition.open(dialog, animateOpen);
        },
        close: (dialog) => {
          const interruptedBrowse = browsing.freezeForClose();
          transition.close(dialog, animateDismiss.current, !interruptedBrowse);
          browsing.cancel();
        },
      }}
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
            onClick={(event) => close(event.detail > 0)}
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
        ref={stageRef}
        onPointerDown={(event) => browsing.pointerDown(event.nativeEvent, displayedPhoto, prev, next)}
        onPointerMove={(event) => browsing.pointerMove(event.nativeEvent, event.currentTarget, () => transition.cancel())}
        onPointerUp={(event) => browsing.pointerEnd(event.nativeEvent, event.currentTarget, commitPhoto)}
        onPointerCancel={(event) => browsing.pointerEnd(event.nativeEvent, event.currentTarget, commitPhoto, true)}
        onLostPointerCapture={(event) => {
          // The touched button releases its implicit capture when the stage
          // takes ownership. Only losing the stage's own capture cancels a drag.
          if (event.target === event.currentTarget)
            browsing.pointerEnd(event.nativeEvent, event.currentTarget, commitPhoto, true);
        }}
        onClickCapture={(event) => {
          if (event.detail > 0 && browsing.consumeClick()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <ViewerImage key={displayedPhoto.id} photo={displayedPhoto} />
        {prev ? (
          <button
            type="button"
            className="viewer-step viewer-step-prev"
            aria-label={`Previous photo (${photoLabel(prev.id)})`}
            onClick={(event) => goTo(prev.id, event.detail > 0)}
          >
            <span aria-hidden="true">←</span>
          </button>
        ) : null}
        {next ? (
          <button
            type="button"
            className="viewer-step viewer-step-next"
            aria-label={`Next photo (${photoLabel(next.id)})`}
            onClick={(event) => goTo(next.id, event.detail > 0)}
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

/** Keep the already-loaded photograph visible while its larger preview decodes. */
function ViewerImage({ photo }: { photo: Photo }) {
  const preview = previewDimensions(photo);
  const [src, setSrc] = useState(() => viewerSource(photo.id));

  useEffect(() => {
    let current = true;
    void decodePreview(photo.id).then((preview) => {
      if (current && preview) setSrc(preview);
    });
    return () => {
      current = false;
    };
  }, [photo.id]);

  return (
    <img
      data-viewer-photo={photo.id}
      draggable={false}
      src={src}
      alt={photoDescription(photo)}
      width={preview.width}
      height={preview.height}
      decoding="async"
    />
  );
}
