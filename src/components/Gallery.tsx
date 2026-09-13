import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isColorBucket } from '../lib/color-buckets';
import {
  colorFilterUrl,
  photoIdFromPath,
  photoPath,
  readColorParam,
} from '../lib/history';
import { photoLabel, sortPhotosById, thumbDimensions } from '../lib/photos';
import type { ColorBucket, Photo } from '../types/photo';
import { photoUrl } from '../config';
import ColorFilter from './ColorFilter';
import PhotoModal from './PhotoModal';
import RadixTheme from './RadixTheme';
import styles from './Gallery.module.css';

interface GalleryProps {
  photos: Photo[];
}

function readInitialFilter(): ColorBucket | null {
  if (typeof window === 'undefined') return null;
  const param = readColorParam(window.location.search);
  return param && isColorBucket(param) ? param : null;
}

export default function Gallery({ photos }: GalleryProps) {
  const sorted = useMemo(() => sortPhotosById(photos).reverse(), [photos]);
  const [colorFilter, setColorFilter] = useState<ColorBucket | null>(readInitialFilter);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const pushedHistory = useRef(false);

  const filtered = useMemo(() => {
    if (!colorFilter) return sorted;
    return sorted.filter((photo) => photo.colorBucket === colorFilter);
  }, [sorted, colorFilter]);

  const setFilter = (bucket: ColorBucket | null) => {
    setColorFilter(bucket);
    history.replaceState(history.state, '', colorFilterUrl(bucket));
  };

  const handlePhotoIdChange = useCallback(
    (id: string | null, options?: { fromPopState?: boolean }) => {
      if (id === null) {
        setOpenPhotoId(null);
        if (!options?.fromPopState && pushedHistory.current) {
          pushedHistory.current = false;
          history.back();
        }
        return;
      }
      setOpenPhotoId(id);
    },
    [],
  );

  const openPhoto = (id: string, event: React.MouseEvent) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setOpenPhotoId(id);
    history.pushState({ photoModal: true }, '', photoPath(id));
    pushedHistory.current = true;
  };

  useEffect(() => {
    const param = readColorParam(window.location.search);
    if (param && isColorBucket(param)) {
      setColorFilter(param);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const id = photoIdFromPath(window.location.pathname);
      if (id) {
        setOpenPhotoId(id);
        pushedHistory.current = true;
      } else {
        handlePhotoIdChange(null, { fromPopState: true });
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handlePhotoIdChange]);

  if (photos.length === 0) {
    return (
      <p className={styles.empty}>
        No photos yet. Add originals to <code>photos-source/</code> and run{' '}
        <code>pnpm process-photos</code>.
      </p>
    );
  }

  return (
    <RadixTheme>
      <ColorFilter selected={colorFilter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <p className={styles.empty}>No photos match this color filter.</p>
      ) : (
        <ul className={styles.gallery}>
          {filtered.map((photo) => {
            const { width, height } = thumbDimensions(photo);
            const label = photoLabel(photo.id);

            return (
              <li key={photo.id}>
                <a
                  className={styles.item}
                  href={photoPath(photo.id)}
                  style={{ aspectRatio: String(photo.aspect) }}
                  onClick={(event) => openPhoto(photo.id, event)}
                >
                  <img
                    className={styles.image}
                    src={photoUrl(photo.id, 'thumb.jpg')}
                    alt={label}
                    width={width}
                    height={height}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <PhotoModal
        photos={filtered}
        photoId={openPhotoId}
        onPhotoIdChange={handlePhotoIdChange}
      />
    </RadixTheme>
  );
}
