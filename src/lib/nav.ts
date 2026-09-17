export const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/license', label: 'License' },
] as const;

export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/imprint', label: 'Imprint' },
] as const;

export function isCurrentPath(currentPath: string, href: string) {
  const normalized = currentPath.replace(/\/+$/, '') || '/';
  return normalized === href;
}
