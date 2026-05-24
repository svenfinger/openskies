import PhotoDownloads from './PhotoDownloads';
import RadixTheme from './RadixTheme';
import styles from './PhotoPageToolbar.module.css';

interface PhotoPageToolbarProps {
  photoId: string;
}

export default function PhotoPageToolbar({ photoId }: PhotoPageToolbarProps) {
  return (
    <div className={styles.root}>
      <RadixTheme>
        <PhotoDownloads photoId={photoId} />
      </RadixTheme>
    </div>
  );
}
