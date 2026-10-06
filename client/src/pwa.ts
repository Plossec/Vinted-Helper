// Installation du service worker (PWA) et détection d'une nouvelle version (§12.6).
import { useSyncExternalStore } from "react";

let enAttente: ServiceWorker | null = null;
const abonnes = new Set<() => void>();
const publier = (sw: ServiceWorker | null) => {
  enAttente = sw;
  for (const a of abonnes) a();
};

export function enregistrerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let rechargement = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (rechargement) return;
    rechargement = true;
    window.location.reload();
  });
  void navigator.serviceWorker.register("/sw.js").then((inscription) => {
    if (inscription.waiting && navigator.serviceWorker.controller) publier(inscription.waiting);
    inscription.addEventListener("updatefound", () => {
      const nouveau = inscription.installing;
      nouveau?.addEventListener("statechange", () => {
        if (nouveau.state === "installed" && navigator.serviceWorker.controller) publier(nouveau);
      });
    });
    // Vérifie régulièrement s'il existe une nouvelle version (application laissée ouverte).
    window.setInterval(() => void inscription.update().catch(() => undefined), 60 * 60 * 1000);
  });
}

/** Active la nouvelle version (la page se recharge). */
export function mettreAJour() {
  enAttente?.postMessage("activer");
}

export function useNouvelleVersion(): boolean {
  return useSyncExternalStore(
    (rappel) => {
      abonnes.add(rappel);
      return () => abonnes.delete(rappel);
    },
    () => enAttente !== null,
  );
}
