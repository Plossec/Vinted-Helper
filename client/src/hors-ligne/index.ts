// File d'attente de l'application : ajout d'actions, envoi automatique (au démarrage, au retour du réseau,
// toutes les 30 secondes) et état observable par les écrans (compteur « N éléments en attente d'envoi »).
import { useSyncExternalStore } from "react";
import {
  type BilanEnvoi,
  type ElementFile,
  envoyerAuServeur,
  elementsDeLaSortie,
  envoyerFile,
  listerDansLOrdre,
  type Operation,
} from "./file.js";
import { creerStockageIndexedDB } from "./indexeddb.js";

const stockage = creerStockageIndexedDB();
const DELAI_RENVOI_MS = 30_000;

export interface EtatFile {
  elements: ElementFile[];
  /** Résultat du dernier essai d'envoi. */
  bilan: BilanEnvoi | null;
  envoiEnCours: boolean;
}

let etat: EtatFile = { elements: [], bilan: null, envoiEnCours: false };
const abonnes = new Set<() => void>();

function publier(modif: Partial<EtatFile>) {
  etat = { ...etat, ...modif };
  for (const abonne of abonnes) abonne();
}

async function rafraichir() {
  publier({ elements: await listerDansLOrdre(stockage) });
}

let envoiPromis: Promise<void> | null = null;

/** Lance un envoi (un seul à la fois). */
export function envoyerMaintenant(): Promise<void> {
  envoiPromis ??= (async () => {
    publier({ envoiEnCours: true });
    try {
      const avant = (await stockage.lister()).filter((e) => e.erreur === null).length;
      const bilan = await envoyerFile(stockage, envoyerAuServeur);
      publier({ bilan });
      // Seulement si quelque chose a été envoyé : les écrans qui écoutent cet évènement relancent eux-mêmes un envoi
      // (vérification de la connexion), ce qui tournerait sans fin sur une file vide.
      if (bilan === "termine" && avant > 0) window.dispatchEvent(new Event("file-envoyee"));
    } finally {
      await rafraichir();
      publier({ envoiEnCours: false });
      envoiPromis = null;
    }
  })();
  return envoiPromis;
}

/** Enregistre des actions sur le téléphone puis tente l'envoi. */
export async function ajouterALaFile(...operations: Operation[]): Promise<void> {
  const base = Date.now();
  for (const [i, operation] of operations.entries()) {
    await stockage.ecrire({ cle: crypto.randomUUID(), creeLe: base + i, operation, erreur: null });
  }
  await rafraichir();
  void envoyerMaintenant();
}

/**
 * Annule une sortie : retire du téléphone tout ce qui la concerne et pas encore envoyé, puis demande au serveur
 * de l'annuler (sans effet si elle n'y était pas encore). Fonctionne sans réseau.
 */
export async function annulerSortie(sortieId: string): Promise<void> {
  for (const e of elementsDeLaSortie(await stockage.lister(), sortieId)) await stockage.supprimer(e.cle);
  await ajouterALaFile({ type: "annulation-sortie", sortieId });
}

/** Remet un élément refusé dans la file (après correction côté serveur, par exemple). */
export async function reessayer(element: ElementFile) {
  await stockage.ecrire({ ...element, erreur: null });
  await rafraichir();
  void envoyerMaintenant();
}

export async function abandonner(element: ElementFile) {
  await stockage.supprimer(element.cle);
  await rafraichir();
}

let demarree = false;

/** Démarre les envois automatiques (une seule fois). */
export function demarrerFile() {
  if (demarree) return;
  demarree = true;
  void rafraichir().then(() => envoyerMaintenant());
  window.addEventListener("online", () => void envoyerMaintenant());
  window.setInterval(() => {
    if (etat.elements.some((e) => e.erreur === null)) void envoyerMaintenant();
  }, DELAI_RENVOI_MS);
}

export function useFile(): EtatFile {
  return useSyncExternalStore(
    (rappel) => {
      abonnes.add(rappel);
      return () => abonnes.delete(rappel);
    },
    () => etat,
  );
}
