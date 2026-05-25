import { Cross2Icon } from '@radix-ui/react-icons';
import {
  Box,
  Dialog,
  Flex,
  IconButton,
  Link,
  Text,
} from '@radix-ui/themes';
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
import styles from './PhotoModal.module.css';

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
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <Dialog.Content
        className={styles.content}
        maxWidth="56rem"
        size="3"
        aria-describedby={undefined}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Flex
          className={styles.chrome}
          justify="between"
          align="center"
          gap="3"
          wrap="wrap"
        >
          <Dialog.Title mb="0" trim="both">
            {label}
          </Dialog.Title>
          <Flex align="center" gap="4" wrap="wrap" className={styles.toolbar}>
            <PhotoDownloads photoId={photo.id} />
            <Dialog.Close>
              <IconButton variant="classic" highContrast color="gray" size="2" aria-label="Close">
                <Cross2Icon width="16" height="16" />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Flex>

        <Box className={styles.imageWrap}>
          <img
            className={styles.image}
            src={photoUrl(photo.id, 'preview.jpg')}
            alt={label}
            width={preview.width}
            height={preview.height}
            decoding="async"
          />
        </Box>

        <Text size="2" color="gray" className={styles.chrome} align="center">
          Free to use under the{' '}
          <Link href="/license" color="gray" underline="always">
            OpenSkies license
          </Link>
          .
        </Text>
      </Dialog.Content>
    </Dialog.Root>
  );
}
