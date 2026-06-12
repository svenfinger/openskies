const CDN_BASE = 'https://cdn.openskies.photos';

/** @param {string | undefined} path */
function isValidPath(path) {
  return typeof path === 'string' && /^\d+\/.+\.jpg$/.test(path);
}

/** @param {string} path */
function downloadFilename(path) {
  return `openskies-${path.replace('/', '-')}`;
}

/** @param {{ params: { path?: string } }} context */
export async function onRequestGet(context) {
  const { path } = context.params;

  if (!isValidPath(path)) {
    return new Response('Not found', { status: 404 });
  }

  const cdnResponse = await fetch(`${CDN_BASE}/${path}`);

  if (!cdnResponse.ok) {
    return new Response('Not found', { status: cdnResponse.status });
  }

  const headers = new Headers();
  headers.set('Content-Type', cdnResponse.headers.get('Content-Type') ?? 'image/jpeg');
  headers.set('Content-Disposition', `attachment; filename="${downloadFilename(path)}"`);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  const etag = cdnResponse.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  return new Response(cdnResponse.body, {
    status: cdnResponse.status,
    headers,
  });
}
