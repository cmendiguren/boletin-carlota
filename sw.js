// Guarda la app para abrirla sin conexión y los boletines ya vistos.
// Sube CACHE_VERSION cuando cambie el código de la app (no hace falta por boletines nuevos).
const CACHE_VERSION = "v1";
const CACHE_APP = "boletin-app-" + CACHE_VERSION;
const CACHE_DATOS = "boletin-datos";

const APP = [
  "./",
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/icono.svg",
  "assets/icono-192.png",
  "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_APP).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("boletin-app-") && k !== CACHE_APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Boletines: primero la red (para tener lo último) y, si no hay conexión, la copia guardada.
  if (url.origin === location.origin && url.pathname.includes("/boletines/")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE_DATOS).then((c) => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // Resto (app y fuentes): primero lo guardado, y se actualiza en segundo plano.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((guardado) => {
      const red = fetch(e.request)
        .then((r) => {
          if (r.ok && (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com"))) {
            const copia = r.clone();
            caches.open(url.origin === location.origin ? CACHE_APP : CACHE_DATOS).then((c) => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});
