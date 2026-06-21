/* Migration worker: replaces the former offline worker, clears only this
   game's caches, then unregisters itself. It intentionally has no fetch
   handler, so every application request uses the network. */
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("munch-spies-") === 0;
      }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.registration.unregister(); })
  );
});
