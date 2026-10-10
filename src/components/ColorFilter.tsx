import { COLOR_BUCKET_SWATCHES, formatBucketLabel } from '../lib/color-buckets';
import type { ColorBucket } from '../types/photo';
import type { CSSProperties } from 'react';

interface ColorFilterProps {
  selected: ColorBucket | null;
  onChange: (bucket: ColorBucket | null, animate: boolean) => void;
}
const colors: (ColorBucket | null)[] = [null, 'blue', 'gray', 'orange'];

export default function ColorFilter({ selected, onChange }: ColorFilterProps) {
  return (
    <div
      className="color-filters"
      role="group"
      aria-label="Filter photographs by color"
    >
      {colors.map((bucket) => (
        <button
          key={bucket ?? 'all'}
          type="button"
          aria-pressed={selected === bucket}
          onClick={(event) => onChange(bucket, event.detail > 0)}
        >
          {bucket && (
            <span
              className="color-swatch"
              style={
                { '--swatch': COLOR_BUCKET_SWATCHES[bucket] } as CSSProperties
              }
              aria-hidden="true"
            />
          )}
          {bucket ? formatBucketLabel(bucket) : 'All skies'}
        </button>
      ))}
    </div>
  );
}
