import { Theme } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import styles from './RadixTheme.module.css';

interface RadixThemeProps {
  children: ReactNode;
}

/** Wrap React islands when they need Theme context; site-wide tokens live on `<html>`. */
export default function RadixTheme({ children }: RadixThemeProps) {
  return (
    <Theme
      accentColor="blue"
      grayColor="mauve"
      radius="large"
      appearance="light"
      hasBackground={false}
      className={styles.root}
    >
      {children}
    </Theme>
  );
}
