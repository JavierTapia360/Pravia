const CACHE_PREFIX = 'pravia-';
const SHELL_CACHE = 'pravia-offline-shell-v2';
const ASSET_CACHE = 'pravia-immutable-assets-v2';
const OFFLINE_INDEX_KEY = '/__pravia_last_online_index__';
const OFFLINE_SHELL = ['/offline.html', '/manifest.webmanifest', '/icons/pravia-192.png', '/icons/pravia-512.png', '/icons/pravia-maskable-512.png'];

self.addEventListener('install', (event) => {
  // El HTML de producción nunca se precachea: podría apuntar a chunks de otro despliegue.
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(OFFLINE_SHELL)));
});

self.addEventListener('activate', (event) => {
  const current = new Set([SHELL_CACHE, ASSET_CACHE]);
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && !current.has(key))
      .map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ code: 'OFFLINE', error: 'Sin conexión al servidor.' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })).then((response) => {
      if (response.ok) event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(OFFLINE_INDEX_KEY, response.clone())));
      return response;
    }).catch(async () => (await caches.match(OFFLINE_INDEX_KEY)) || (await caches.match('/offline.html'))));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Vite asigna hash de contenido a /assets/*: cache-first es seguro y nunca mezcla versiones.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) event.waitUntil(cache.put(request, response.clone()));
      return response;
    }));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) event.waitUntil(cache.put(request, response.clone()));
      return response;
    }));
  }
});
