import { Button, Flex, IconButton, Separator } from '@radix-ui/themes';
import {
  COLOR_BUCKET_ORDER,
  COLOR_BUCKET_RADIX_COLORS,
  formatBucketLabel,
} from '../lib/color-buckets';
import type { ColorBucket } from '../types/photo';
import styles from './ColorFilter.module.css';

interface ColorFilterProps {
  selected: ColorBucket | null;
  onChange: (bucket: ColorBucket | null) => void;
}

export default function ColorFilter({ selected, onChange }: ColorFilterProps) {
  const isAllSelected = selected === null;

  return (
    <Flex
      align="center"
      gap="4"
      wrap="wrap"
      mb="6"
      role="group"
      aria-label="Filter by color"
    >
      <Button
        type="button"
        variant={isAllSelected ? 'classic' : 'outline'}
        color="gray"
        size="3"
        radius="full"
        highContrast={isAllSelected}
        aria-pressed={isAllSelected}
        onClick={() => onChange(null)}
      >
        Any color
      </Button>

      <Separator orientation="vertical" decorative className={styles.divider} />

      <Flex align="center" gap="2" wrap="wrap">
        {COLOR_BUCKET_ORDER.map((bucket) => {
          const isSelected = selected === bucket;
          return (
            <IconButton
              key={bucket}
              type="button"
              variant={isSelected ? 'classic' : 'solid'}
              color={COLOR_BUCKET_RADIX_COLORS[bucket]}
              size={isSelected ? '3' : '2'}
              radius="full"
              aria-pressed={isSelected}
              aria-label={formatBucketLabel(bucket)}
              title={formatBucketLabel(bucket)}
              onClick={() => onChange(isSelected ? null : bucket)}
            />
          );
        })}
      </Flex>
    </Flex>
  );
}
