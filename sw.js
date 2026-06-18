const CACHE_NAME = "hidden-eye-cache-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./hud_background.png",
    "./sujal_mishra.jpg",
    "./shubhanshu_singh.jpg",
    "./pwa_icon.png",
    "https://docs.opencv.org/4.5.4/opencv.js"
];

// Install Event - Pre-cache all local assets + OpenCV.js
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("[Service Worker] Pre-caching offline dependencies...");
            // Map assets and catch individual failures to prevent cache install rejection
            return Promise.all(
                ASSETS.map(asset => {
                    return cache.add(asset).catch(err => {
                        console.error(`[Service Worker] Failed to cache: ${asset}`, err);
                    });
                })
            );
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log("[Service Worker] Evicting deprecated cache:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Cache-First strategy with ignoreSearch to handle version query strings (?v=...)
self.addEventListener("fetch", event => {
    // Only intercept http/https requests (ignore chrome-extension URLs)
    if (!event.request.url.startsWith("http")) return;

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                // Only cache successful requests
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(err => {
                console.log("[Service Worker] Offline fetch failed:", err);
            });
        })
    );
});
