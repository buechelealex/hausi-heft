// Service Worker: legt alle Dateien der App im Cache ab, damit sie ohne Netz
// startet. Notwendig, damit Chrome die App unter Android zur Installation anbietet.
//
// Die Hausaufgaben selbst liegen nicht hier, sondern im localStorage — dieser
// Cache hält nur die Programmdateien.
//
// WICHTIG beim Ändern von CSS oder JavaScript: VERSION hier genauso hochzählen
// wie die ?v=-Marken in den vier HTML-Dateien. Der Cache hängt am Namen, ein
// neuer Name ersetzt den alten komplett.
const VERSION = "v1";
const CACHE = "hausi-heft-" + VERSION;

// Jede Aktivität liegt in ihrem eigenen Ordner und bringt ihre eigene
// scripts.js und style.css mit; shared/ ist die gemeinsame Grundlage.
const ASSETS = [
  "./",
  "./index.html",
  "./eintragen/",
  "./faecher/",
  "./archiv/",
  "./manifest.json",
  "./shared/base.css?v=1",
  "./shared/core.js?v=1",
  "./style.css?v=1",
  "./scripts.js?v=1",
  "./eintragen/style.css?v=1",
  "./eintragen/scripts.js?v=1",
  "./faecher/style.css?v=1",
  "./faecher/scripts.js?v=1",
  "./archiv/style.css?v=1",
  "./archiv/scripts.js?v=1",
  "./icon-192.png?v=1",
  "./icon-512.png?v=1",
  "./icon-maskable-512.png?v=1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Einzeln statt addAll: eine fehlende Datei würde sonst die komplette
      // Installation scheitern lassen und die App bliebe ohne Cache.
      .then(cache => Promise.all(ASSETS.map(url =>
        cache.add(url).catch(err => console.warn("nicht im Cache:", url, err))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith("hausi-heft-") && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Seitenaufrufe zuerst aus dem Netz: so kommt eine neu veröffentlichte Fassung
  // an, ohne dass jemand den Cache leeren muss. Ohne Netz aus dem Cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)
          .then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // CSS, JS und Bilder tragen eine ?v=-Marke und ändern sich unter derselben
  // Adresse nie — daher zuerst aus dem Cache.
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
