// Alertes partagées par la barre de navigation et l'écran Articles (#131) : un seul appel toutes les 30 secondes au
// plus, au lieu d'un appel à chaque changement d'écran ; toute modification (vente, statut…) vide le cache.
import { api, surModification } from "../api.js";
import type { AlertesServeur } from "../composants/Alertes.js";

export const DUREE_CACHE_ALERTES_MS = 30_000;

let cache: { instant: number; promesse: Promise<AlertesServeur> } | null = null;
surModification(() => {
  cache = null;
});

export function chargerAlertes(maintenant = Date.now()): Promise<AlertesServeur> {
  if (cache === null || maintenant - cache.instant >= DUREE_CACHE_ALERTES_MS) {
    const promesse = api.get<AlertesServeur>("/api/alertes");
    cache = { instant: maintenant, promesse };
    // Échec : on ne garde pas l'erreur en cache.
    promesse.catch(() => {
      if (cache?.promesse === promesse) cache = null;
    });
  }
  return cache.promesse;
}
