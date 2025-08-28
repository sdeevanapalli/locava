// service-worker.js

const CACHE_NAME = "quietspace-cache-v1";

// Instead of hardcoding files, we’ll cache them dynamically
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache your core files (HTML + offline page, etc.)
      return cache.addAll([
        "/",
        "/index.html",
      ]);
    })
  );
});

// Activate event: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch event: network-first for CSS/JS (with version), cache-first for others
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // For CSS/JS with ?v= query → always fetch latest, update cache
  if (
    request.url.includes(".css") ||
    request.url.includes(".js")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)) // fallback if offline
    );
  } else {
    // For HTML, images, etc → cache-first
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request)
      )
    );
  }
});
