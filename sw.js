'use strict';
const CACHE = 'speakforward-shell-v3';
const FILES = ['./', './index.html', './styles.css', './legacy.js', './core.js', './lessons.js', './app.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('speakforward-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.location.href).pathname)) return;
  // Keep each installed shell coherent; a new worker activates only on explicit update or after old tabs close.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const request = event.request.mode === 'navigate' ? new URL('./index.html', self.location.href).href : event.request;
    const cached = await cache.match(request);
    if (cached) return cached;
    return fetch(event.request);
  }));
});
