const CACHE_NAME = "location-saver-cache-v4"; // bump version when you update files
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

// Install event - cache files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // activate worker immediately
});

// Activate event - clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // take control of open clients
});

// Fetch event
self.addEventListener("fetch", event => {
  const request = event.request;

  // Always try network first for HTML/JS (so new code loads)
  if (request.destination === "document" || request.destination === "script") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  } else {
    // Cache-first for other assets (CSS, manifest, etc.)
    event.respondWith(
      caches.match(request).then(response => response || fetch(request))
    );
  }
});
