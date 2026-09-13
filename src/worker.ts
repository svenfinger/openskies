import { WorkerEntrypoint } from 'cloudflare:workers';

const CDN_BASE = 'https://cdn.openskies.photos';
const DOWNLOAD_PATH = /^\/download\/(\d+\/.+\.jpg)$/;

function downloadFilename(path: string) {
  return `openskies-${path.replace('/', '-')}`;
}

export default class extends WorkerEntrypoint {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const match = url.pathname.match(DOWNLOAD_PATH);

    if (!match) {
      return new Response('Not found', { status: 404 });
    }

    const path = match[1];
    const cdnResponse = await fetch(`${CDN_BASE}/${path}`);

    if (!cdnResponse.ok) {
      return new Response('Not found', { status: cdnResponse.status });
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      cdnResponse.headers.get('Content-Type') ?? 'image/jpeg',
    );
    headers.set(
      'Content-Disposition',
      `attachment; filename="${downloadFilename(path)}"`,
    );
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    const etag = cdnResponse.headers.get('ETag');
    if (etag) headers.set('ETag', etag);

    return new Response(cdnResponse.body, {
      status: cdnResponse.status,
      headers,
    });
  }
}
