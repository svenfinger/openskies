import { DownloadIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, ChevronDownIcon } from '@radix-ui/themes';
import { photoUrl } from '../config';
import { DOWNLOAD_ORIGINAL, DOWNLOAD_SIZES } from '../lib/photos';

interface PhotoDownloadsProps {
  photoId: string;
}

function downloadFilename(photoId: string, file: string) {
  return `openskies-${photoId}-${file}`;
}

export default function PhotoDownloads({ photoId }: PhotoDownloadsProps) {
  const original = DOWNLOAD_ORIGINAL;

  return (
    <Flex gap="2" wrap="wrap" align="center">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline" color="gray" size="2">
            Download size
            <ChevronDownIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {DOWNLOAD_SIZES.map((item) => (
            <DropdownMenu.Item key={item.file} asChild shortcut={item.detail}>
              <a
                href={photoUrl(photoId, item.file)}
                download={downloadFilename(photoId, item.file)}
              >
                {item.label}
              </a>
            </DropdownMenu.Item>
          ))}
            <DropdownMenu.Separator />
            <DropdownMenu.Item asChild>
              <a
                href={photoUrl(photoId, original.file)}
                download={downloadFilename(photoId, original.file)}
              >
                Original size
              </a>
            </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Button asChild variant="classic" color="blue" size="2">
        <a
          href={photoUrl(photoId, original.file)}
          download={downloadFilename(photoId, original.file)}
        >
          <DownloadIcon width="16" height="16" />
          Download
        </a>
      </Button>
    </Flex>
  );
}
