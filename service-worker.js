/* Service worker — caches the whole app shell so the game runs fully offline
   once it has loaded a single time. Relative URLs so it works on any host path
   (Netlify root, GitHub Pages subpath, etc.). Bump CACHE to force an update. */
var CACHE = "munch-spies-20260620212314";
var ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "js/content.js",
  "js/storage.js",
  "js/geo.js",
  "js/ui.js",
  "js/engine.js",
  "icons/icon.svg"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // addAll fails the whole install if one asset 404s; add individually instead.
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(url).catch(function (err) { console.warn("SW skip cache:", url, err); });
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        // runtime-cache same-origin GETs (e.g. anything added later)
        if (resp && resp.status === 200 && resp.type === "basic") {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () {
        // offline fallback to the app shell for navigations
        if (e.request.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
