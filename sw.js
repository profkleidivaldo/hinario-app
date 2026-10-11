const CACHE = "hinario-adventista-v2";
const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./classes/hymns.js"
];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Tenta armazenar todos os arquivos essenciais, incluindo o banco de letras.
    await Promise.all(CORE.map(async path => {
      try {
        const request = new Request(path, { cache: "reload" });
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response);
      } catch (_) { /* arquivos indisponíveis não impedem a instalação do worker */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("hinario-adventista-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (_) {
      if (event.request.mode === "navigate") {
        return (await cache.match("./index.html")) || Response.error();
      }
      return (await cache.match("./classes/hymns.js")) || Response.error();
    }
  })());
});
