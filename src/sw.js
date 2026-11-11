// Keeps a full copy of the guide on the device.
// FILES lists every published file with a fingerprint of its content. When the guide is
// rebuilt this script changes, the browser installs it, and only files whose fingerprint
// changed are downloaded again.
const FILES = __FILES__;

const CACHE = 'fog-files';
const SCOPE = self.registration.scope;
const BASE = new URL(SCOPE).pathname;
const known = (file) => Object.prototype.hasOwnProperty.call(FILES, file);
const keyOf = (file) => `${SCOPE}${encodeURI(file)}?v=${FILES[file]}`;
const addressOf = (file) => SCOPE + encodeURI(file.replace(/(^|\/)index\.html$/, '$1'));

async function tell(message) {
  const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const page of pages) page.postMessage(message);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const saved = new Set((await cache.keys()).map((request) => request.url));
      const queue = Object.keys(FILES).filter((file) => !saved.has(keyOf(file)));
      const total = queue.length;
      let done = 0;
      let reported = 0;

      const download = async () => {
        for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
          const response = await fetch(addressOf(file), { cache: 'no-store', credentials: 'same-origin' });
          if (!response.ok) throw new Error(`${file}: ${response.status}`);
          const copy = new Response(await response.blob(), { status: 200, headers: response.headers });
          await cache.put(keyOf(file), copy);
          done++;
          if (done === total || done - reported >= Math.max(5, total / 20)) {
            reported = done;
            tell({ type: 'progress', done, total });
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, download));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const wanted = new Map(Object.keys(FILES).map((file) => [keyOf(file), file]));
      const changed = new Set();
      for (const request of await cache.keys()) {
        if (wanted.has(request.url)) continue;
        const file = decodeURI(request.url.slice(SCOPE.length).replace(/\?v=[^?]*$/, ''));
        if (known(file)) changed.add(file);
        await cache.delete(request);
      }
      await self.clients.claim();
      await tell({ type: 'ready', changed: [...changed] });
    })(),
  );
});

async function notFound(cache) {
  const page = known('404.html') && (await cache.match(keyOf('404.html')));
  if (!page) return Response.error();
  return new Response(await page.blob(), { status: 404, statusText: 'Not Found', headers: page.headers });
}

async function respond(request, url) {
  const cache = await caches.open(CACHE);
  let file;
  try {
    file = decodeURIComponent(url.pathname.slice(BASE.length));
  } catch {
    file = url.pathname.slice(BASE.length);
  }
  if (file === '' || file.endsWith('/')) file += 'index.html';

  if (known(file)) {
    const saved = await cache.match(keyOf(file));
    if (saved) return saved;
  } else if (request.mode === 'navigate' && known(`${file}/index.html`)) {
    return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 301);
  }

  // Not part of the saved guide: use the network, and for pages fall back to "Page not found".
  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === 'navigate') return notFound(cache);
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  event.respondWith(respond(request, url));
});
