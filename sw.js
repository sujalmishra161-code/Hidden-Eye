const CACHE_NAME = "hidden-eye-cache-v2";
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

// Fetch Event - Network-First for HTML/CSS/JS, Cache-First for static libraries/images
self.addEventListener("fetch", event => {
    if (!event.request.url.startsWith("http")) return;

    const url = new URL(event.request.url);
    
    // Check if it's a static/large asset that changes rarely (OpenCV, images, icons, manifest)
    const isStaticAsset = url.pathname.endsWith("opencv.js") || 
                          url.pathname.endsWith(".png") || 
                          url.pathname.endsWith(".jpg") || 
                          url.pathname.endsWith(".jpeg") ||
                          url.pathname.endsWith(".svg") ||
                          url.pathname.endsWith("manifest.json");

    if (isStaticAsset) {
        // Cache-First strategy
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }).catch(() => {
                    // Fallback to any match in case network fails
                    return caches.match(event.request);
                });
            })
        );
    } else {
        // Network-First strategy for HTML, CSS, JS (dynamic application files)
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }
                return networkResponse;
            }).catch(() => {
                // Network failed (offline), fallback to cache
                return caches.match(event.request, { ignoreSearch: true });
            })
        );
    }
});
