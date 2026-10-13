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

/*
 * Notifications (BUILD 4.2): what the server sent, already decrypted by the browser. One per pin
 * (`tag`), so a newer notice replaces an older one. A tap opens the pin, in a window already open
 * on it if there is one.
 */
self.addEventListener("push", (event) => {
  let notice = null;
  try {
    notice = event.data ? event.data.json() : null;
  } catch {
    notice = null;
  }
  if (!notice || typeof notice.title !== "string") return;
  event.waitUntil(
    self.registration.showNotification(notice.title, {
      body: notice.body,
      tag: notice.tag,
      data: { url: notice.url },
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      lang: "pt-BR",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/mapa", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url === url);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
