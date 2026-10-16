import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ArrowDown01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { photoDownloadUrl } from '../config';
import {
  DOWNLOAD_ORIGINAL,
  DOWNLOAD_SIZES,
  resizedDimensions,
} from '../lib/photos';
import type { Photo } from '../types/photo';
import { MOTION, reducedMotion } from '../lib/motion';

interface PhotoDownloadsProps {
  photo: Photo;
}

function downloadFilename(photoId: string, file: string) {
  return `openskies-${photoId}-${file}`;
}

export default function PhotoDownloads({ photo }: PhotoDownloadsProps) {
  const photoId = photo.id;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const original = DOWNLOAD_ORIGINAL;

  function closeOptions(restoreFocus = false) {
    animationRef.current?.cancel();
    animationRef.current = null;
    const details = detailsRef.current;
    if (!details?.open) return;
    details.open = false;
    if (restoreFocus) details.querySelector('summary')?.focus();
  }

  function openOptions(animate: boolean) {
    const details = detailsRef.current;
    if (!details || details.open) return;
    animationRef.current?.cancel();
    animationRef.current = null;

    // Open and animate in the same task. The native toggle event is deferred,
    // so starting there can paint the final position before jumping back.
    details.open = true;
    const panel = details.querySelector('.download-list');
    if (!animate || !panel || typeof panel.animate !== 'function') return;

    const reduce = reducedMotion();
    const animation = panel.animate(
      reduce
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
      { duration: reduce ? MOTION.reduced : MOTION.menu, easing: reduce ? 'linear' : MOTION.ease },
    );
    animationRef.current = animation;
    void animation.finished.then(() => {
      if (animationRef.current === animation) animationRef.current = null;
    }, () => {});
  }

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const cancel = () => animationRef.current?.cancel();
    preference.addEventListener('change', cancel);
    const closeOutside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !detailsRef.current?.contains(event.target)
      ) {
        closeOptions();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      cancel();
      preference.removeEventListener('change', cancel);
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);

  useEffect(() => {
    closeOptions();
  }, [photoId]);

  function onKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    animationRef.current?.cancel();
    const details = event.currentTarget;
    if (event.key === 'Escape' && details.open) {
      event.preventDefault();
      event.stopPropagation();
      closeOptions(true);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    if (!details.open && event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
      return;
    event.preventDefault();
    event.stopPropagation();
    details.open = true;
    const links = Array.from(details.querySelectorAll('a'));
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    let next = 0;
    if (event.key === 'End' || (event.key === 'ArrowUp' && index < 0))
      next = links.length - 1;
    else if (event.key === 'ArrowDown') next = (index + 1) % links.length;
    else if (event.key === 'ArrowUp')
      next = (index - 1 + links.length) % links.length;
    links[next]?.focus();
  }

  return (
    <div
      className="download-control"
      role="group"
      aria-label="Download photo"
      data-download-control
    >
      <a
        className="site-button download-primary"
        href={photoDownloadUrl(photoId, original.file)}
        download={downloadFilename(photoId, original.file)}
      >
        <HugeiconsIcon
          icon={Download01Icon}
          strokeWidth={2}
          aria-hidden="true"
        />
        Download original
      </a>
      <details
        ref={detailsRef}
        className="download-options"
        onKeyDown={onKeyDown}
      >
        <summary
          className="site-button download-trigger"
          aria-label="Choose download size"
          onClick={(event) => {
            event.preventDefault();
            if (detailsRef.current?.open) closeOptions();
            else openOptions(event.detail > 0);
          }}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            aria-hidden="true"
          />
        </summary>
        <div
          className="download-list"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a'))
              closeOptions(true);
          }}
        >
          {DOWNLOAD_SIZES.map((item) => {
            const size = resizedDimensions(photo, item.width);
            return (
              <a
                key={item.file}
                href={photoDownloadUrl(photoId, item.file)}
                download={downloadFilename(photoId, item.file)}
              >
                <span>{item.label}</span>
                <span className="download-dimensions">
                  {size.width} × {size.height}
                </span>
              </a>
            );
          })}
          <hr />
          <a
            href={photoDownloadUrl(photoId, original.file)}
            download={downloadFilename(photoId, original.file)}
          >
            <span>Original</span>
            <span className="download-dimensions">
              {photo.width} × {photo.height}
            </span>
          </a>
        </div>
      </details>
    </div>
  );
}
