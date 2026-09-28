// Startbereit – Offline-Speicher
// Seite selbst: erst Netz (max. 3 s), sonst gespeicherte Version → Updates kommen sofort, offline läuft trotzdem.
// Übrige Dateien (Icons, Manifest): gespeicherte Version, im Hintergrund aktualisieren.
// Persönliche Daten liegen im localStorage und werden hier nie angefasst.
const CACHE = 'startbereit-v4';
const PAGE = './index.html';
const ASSETS = ['./', PAGE, './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

function pageNetworkFirst(req) {
  return caches.open(CACHE).then(cache => {
    const net = fetch(req, { cache: 'no-store' }).then(res => {
      if (res && res.ok) cache.put(PAGE, res.clone());
      return res;
    });
    const fallback = new Promise(resolve => setTimeout(resolve, 3000)).then(() => cache.match(PAGE));
    return Promise.race([net, fallback])
      .then(res => res || net)
      .catch(() => cache.match(PAGE));
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(pageNetworkFirst(req)); return; }
  e.respondWith(caches.open(CACHE).then(cache =>
    cache.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })
  ));
});
