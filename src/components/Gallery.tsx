import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { isColorBucket } from '../lib/color-buckets';
import {
  colorFilterUrl,
  photoIdFromPath,
  photoPath,
  readColorParam,
} from '../lib/history';
import {
  galleryComposition,
  photoDescription,
  photoLabel,
  sortPhotosById,
  thumbDimensions,
  previewDimensions,
  resizedDimensions,
} from '../lib/photos';
import type { ColorBucket, Photo } from '../types/photo';
import { photoUrl } from '../config';
import ColorFilter from './ColorFilter';
import PhotoModal from './PhotoModal';
import { createGalleryMotion } from '../lib/gallery-motion';

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
  // Match the static HTML on the first render; apply URL state after hydration.
  const [colorFilter, setColorFilter] = useState<ColorBucket | null>(null);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [animatePhotoOpen, setAnimatePhotoOpen] = useState(false);
  const pushedHistory = useRef(false);
  const collectionRef = useRef<HTMLElement | null>(null);
  const [motion] = useState(createGalleryMotion);

  const filtered = useMemo(() => {
    if (!colorFilter) return sorted;
    return sorted.filter((photo) => photo.colorBucket === colorFilter);
  }, [sorted, colorFilter]);

  const composition = useMemo(() => galleryComposition(filtered), [filtered]);

  const setFilter = (bucket: ColorBucket | null, animate: boolean) => {
    if (bucket === colorFilter) return;
    motion.prepare(collectionRef.current, animate);
    setColorFilter(bucket);
    history.replaceState(history.state, '', colorFilterUrl(bucket));
  };

  useLayoutEffect(() => motion.arrive(collectionRef.current), [colorFilter, motion]);
  useEffect(() => () => motion.cancel(), [motion]);

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

  const openPhoto = (
    id: string,
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
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
    motion.cancel();
    event.currentTarget.focus({ preventScroll: true });
    setAnimatePhotoOpen(event.detail > 0);
    setOpenPhotoId(id);
    history.pushState({ photoModal: true }, '', photoPath(id));
    pushedHistory.current = true;
  };

  useEffect(() => {
    setColorFilter(readInitialFilter());
  }, []);

  useEffect(() => {
    const onPopState = () => {
      motion.cancel();
      const id = photoIdFromPath(window.location.pathname);
      if (id) {
        setAnimatePhotoOpen(false);
        setOpenPhotoId(id);
        pushedHistory.current = true;
      } else {
        pushedHistory.current = false;
        setColorFilter(readInitialFilter());
        handlePhotoIdChange(null, { fromPopState: true });
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handlePhotoIdChange, motion]);

  return (
    <section id="collection" aria-labelledby="collection-title">
      <div className="collection-toolbar">
        <div className="collection-heading">
          <h2 id="collection-title">The collection</h2>
          <p className="small-text" role="status">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'photograph' : 'photographs'}
          </p>
        </div>
        <ColorFilter selected={colorFilter} onChange={setFilter} />
      </div>
      {filtered.length === 0 ? (
        <p className="empty-message" ref={(element) => { collectionRef.current = element; }}>
          No photographs here just yet. Try another color.
        </p>
      ) : (
        <ul className="photo-grid" ref={(element) => { collectionRef.current = element; }}>
          {composition.map(({ photo, fraction, gaps }, index) => {
            const label = photoLabel(photo.id);
            const thumb = thumbDimensions(photo);
            const preview = previewDimensions(photo);
            const medium = resizedDimensions(photo, 960);
            const orientation =
              photo.width < photo.height ? 'portrait' : 'landscape';
            const mobileFull =
              (index + 1) % 5 === 3 && orientation === 'landscape';
            const sizes = `(max-width: 700px) ${mobileFull ? 'calc(100vw - 40px)' : 'calc((100vw - 56px) / 2)'}, (min-width: 1440px) ${Math.round((1344 - 24 * gaps) * fraction)}px, ${Math.ceil(fraction * 100)}vw`;
            return (
              <li
                key={photo.id}
                data-orientation={orientation}
                style={
                  {
                    '--photo-width': `${fraction * 100}%`,
                    '--photo-gaps': fraction * gaps,
                  } as CSSProperties
                }
              >
                <a
                  href={photoPath(photo.id)}
                  className="photo-link"
                  aria-label={`View photograph ${label}. ${photoDescription(photo)}`}
                  onClick={(event) => openPhoto(photo.id, event)}
                >
                  <figure>
                    <img
                      data-gallery-photo={photo.id}
                      src={photoUrl(photo.id, 'thumb.jpg')}
                      srcSet={`${photoUrl(photo.id, 'thumb.jpg')} ${thumb.width}w, ${photoUrl(photo.id, '960.jpg')} ${medium.width}w, ${photoUrl(photo.id, 'preview.jpg')} ${preview.width}w`}
                      sizes={sizes}
                      alt={photoDescription(photo)}
                      width={thumb.width}
                      height={thumb.height}
                      loading={index < 2 ? 'eager' : 'lazy'}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      decoding="async"
                    />
                    <figcaption className="photo-caption">
                      <span className="photo-number">{label}</span>
                      <span className="photo-view" aria-hidden="true">
                        View photograph ↗
                      </span>
                      <span>
                        {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                      </span>
                    </figcaption>
                  </figure>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <PhotoModal
        photos={filtered}
        photoId={openPhotoId}
        animateOpen={animatePhotoOpen}
        onPhotoIdChange={handlePhotoIdChange}
      />
    </section>
  );
}
