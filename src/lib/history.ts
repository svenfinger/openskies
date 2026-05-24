const PHOTO_PATH = /^\/photo\/(\d+)\/?$/;

export function photoIdFromPath(pathname: string): string | null {
  const match = pathname.match(PHOTO_PATH);
  return match?.[1] ?? null;
}

export function photoPath(id: string): string {
  return `/photo/${id}`;
}

export function readColorParam(search: string): string | null {
  return new URLSearchParams(search).get('color');
}

export function colorFilterUrl(color: string | null): string {
  const url = new URL(window.location.href);
  if (color) url.searchParams.set('color', color);
  else url.searchParams.delete('color');
  return `${url.pathname}${url.search}`;
}
