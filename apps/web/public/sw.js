/*
 * The service worker (DECISIONS round 11: an installable app). Pages come from the network, with an
 * offline page when there's none; the build's hashed assets, fonts and icons are cached as they're
 * used, so the shell opens fast on a slow connection. Nothing else is cached: no data, no server
 * functions, no photos, nothing from other origins (map tiles, Turnstile).
 */
const VERSION = "fala-2";
// "/offline", not "/offline.html": the host redirects the latter, and a navigation can't be answered
// with a redirected response.
const SHELL = ["/offline", "/favicon.svg", "/fonts/geist-latin.woff2", "/icons/icon-192.png"];
const STATIC = ["/assets/", "/fonts/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline", { ignoreVary: true })));
    return;
  }

  if (STATIC.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        // Fonts are fetched with CORS and stored without: compare by URL alone.
        const hit = await cache.match(request, { ignoreVary: true });
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
