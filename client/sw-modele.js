// Service worker de Vinted Helper (PWA) — généré à la construction par vite.config.ts.
// - Garde l'application (pages, scripts, styles, icônes) sur le téléphone pour l'ouvrir sans réseau.
// - Ne met jamais en cache l'API (/api) : les données passent toujours par le serveur ou la file d'attente.
// - Nouvelle version : elle attend que l'utilisateur clique « Mettre à jour » (message « activer »).
const VERSION = "__VERSION__";
const FICHIERS = __FICHIERS__;
const CACHE = `vinted-helper-${VERSION}`;

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", ...FICHIERS])));
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (evenement) => {
  if (evenement.data === "activer") self.skipWaiting();
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  const url = new URL(requete.url);
  if (requete.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (requete.mode === "navigate") {
    // Pages : le réseau d'abord (version à jour), sinon l'application gardée sur le téléphone.
    evenement.respondWith(fetch(requete).catch(() => caches.match("/", { cacheName: CACHE })));
    return;
  }
  // Fichiers de l'application (noms uniques à chaque version) : le cache d'abord.
  evenement.respondWith(caches.match(requete, { cacheName: CACHE }).then((trouve) => trouve ?? fetch(requete)));
});
