import {
  COLOR_BUCKET_ORDER,
  formatBucketLabel,
} from '../lib/color-buckets';
import type { ColorBucket } from '../types/photo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ColorFilterProps {
  selected: ColorBucket | null;
  onChange: (bucket: ColorBucket | null) => void;
}

const ANY_COLOR = 'any';

const COLOR_OPTIONS = [
  { value: ANY_COLOR, label: 'Any color' },
  ...COLOR_BUCKET_ORDER.map((bucket) => ({
    value: bucket,
    label: formatBucketLabel(bucket),
  })),
];

export default function ColorFilter({ selected, onChange }: ColorFilterProps) {
  return (
    <div className="mb-16 flex justify-center">
      <Select
        items={COLOR_OPTIONS}
        value={selected ?? ANY_COLOR}
        onValueChange={(value) => {
          onChange(value && value !== ANY_COLOR ? (value as ColorBucket) : null);
        }}
      >
        <SelectTrigger className="min-w-44" aria-label="Filter by color">
          <SelectValue placeholder="Any color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_COLOR}>Any color</SelectItem>
          {COLOR_BUCKET_ORDER.map((bucket) => (
            <SelectItem key={bucket} value={bucket}>
              {formatBucketLabel(bucket)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
