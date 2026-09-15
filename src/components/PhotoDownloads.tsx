import { ArrowDown01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { photoDownloadUrl } from '../config';
import { DOWNLOAD_ORIGINAL, DOWNLOAD_SIZES } from '../lib/photos';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PhotoDownloadsProps {
  photoId: string;
}

function downloadFilename(photoId: string, file: string) {
  return `openskies-${photoId}-${file}`;
}

export default function PhotoDownloads({ photoId }: PhotoDownloadsProps) {
  const original = DOWNLOAD_ORIGINAL;

  return (
    <ButtonGroup aria-label="Download photo">
      <Button
        nativeButton={false}
        render={
          <a
            href={photoDownloadUrl(photoId, original.file)}
            download={downloadFilename(photoId, original.file)}
          />
        }
      >
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} data-icon="inline-start" />
        Download
      </Button>
      <ButtonGroupSeparator className="bg-primary-foreground/30" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon" aria-label="Choose download size" />}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {DOWNLOAD_SIZES.map((item) => (
            <DropdownMenuItem
              key={item.file}
              render={
                <a
                  href={photoDownloadUrl(photoId, item.file)}
                  download={downloadFilename(photoId, item.file)}
                />
              }
            >
              {item.label}
              <DropdownMenuShortcut>{item.detail}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <a
                href={photoDownloadUrl(photoId, original.file)}
                download={downloadFilename(photoId, original.file)}
              />
            }
          >
            Original size
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
