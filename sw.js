// Permite abrir la app sin conexión con lo último que se haya visto.
// Estrategia: primero la red (para tener siempre la versión más nueva) y, si no hay conexión, la copia guardada.
// Las fuentes de Google se sirven desde la copia guardada para no depender de la red.
const CACHE_VERSION = "v2";
const CACHE = "boletin-" + CACHE_VERSION;

const APP = [
  "./",
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/icono.svg",
  "assets/icono-192.png",
  "manifest.webmanifest",
  "revistas.json",
  "boletines/index.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("boletin-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardar(peticion, respuesta) {
  if (respuesta && respuesta.ok) {
    const copia = respuesta.clone();
    caches.open(CACHE).then((c) => c.put(peticion, copia));
  }
  return respuesta;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const esFuente = url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com");

  if (esFuente) {
    e.respondWith(caches.match(e.request).then((g) => g || fetch(e.request).then((r) => guardar(e.request, r))));
    return;
  }
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((r) => guardar(e.request, r))
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
