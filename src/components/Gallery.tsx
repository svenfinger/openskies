import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isColorBucket } from '../lib/color-buckets';
import {
  colorFilterUrl,
  photoIdFromPath,
  photoPath,
  readColorParam,
} from '../lib/history';
import { photoLabel, sortPhotosById } from '../lib/photos';
import type { ColorBucket, Photo } from '../types/photo';
import { photoUrl } from '../config';
import ColorFilter from './ColorFilter';
import PhotoModal from './PhotoModal';
import { Card } from '@/components/ui/card';

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
      <p className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        No photos yet. Add originals to <code className="text-foreground">photos-source/</code> and run{' '}
        <code className="text-foreground">pnpm process-photos</code>.
      </p>
    );
  }

  return (
    <>
      <ColorFilter selected={colorFilter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No photos match this color filter.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((photo) => {
            const label = photoLabel(photo.id);

            return (
              <li key={photo.id}>
                <a
                  href={photoPath(photo.id)}
                  className="group block rounded-[min(var(--radius-4xl),24px)] focus-visible:ring-3 focus-visible:ring-ring/30"
                  aria-label={label}
                  onClick={(event) => openPhoto(photo.id, event)}
                >
                  <Card className="gap-0 py-0 shadow-none">
                    <div className="aspect-square overflow-hidden">
                      <img
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        src={photoUrl(photo.id, 'thumb.jpg')}
                        alt={label}
                        width={600}
                        height={600}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </Card>
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
    </>
  );
}
