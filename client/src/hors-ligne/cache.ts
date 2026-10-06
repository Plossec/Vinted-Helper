// Données gardées sur le téléphone pour travailler sans réseau : listes de référence et sortie en cours.
import type { Referentiels } from "../api.js";

const CLE_REFERENTIELS = "vh-referentiels";
const CLE_SORTIE = "vh-sortie-en-cours";

export interface SortieEnCours {
  id: string;
  date: string;
  /** Absent pour un lieu saisi librement et pas encore connu (créé à l'envoi de la sortie). */
  lieuId: string | null;
  lieu: string;
}

function lire<T>(cle: string): T | null {
  try {
    const brut = localStorage.getItem(cle);
    return brut === null ? null : (JSON.parse(brut) as T);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage plein ou désactivé : l'application fonctionne quand même en ligne.
  }
}

export const lireReferentielsEnCache = () => lire<Referentiels>(CLE_REFERENTIELS);
export const memoriserReferentiels = (r: Referentiels) => ecrire(CLE_REFERENTIELS, r);

/** La sortie en cours est mémorisée sur le téléphone (§5.1). */
export const lireSortieEnCours = () => lire<SortieEnCours>(CLE_SORTIE);
export const memoriserSortieEnCours = (s: SortieEnCours | null) => ecrire(CLE_SORTIE, s);

/** Listes de référence : depuis le serveur si possible (et mémorisées), sinon la dernière copie. */
export async function chargerReferentiels(
  lireServeur: () => Promise<Referentiels>,
): Promise<{ refs: Referentiels | null; horsLigne: boolean }> {
  try {
    const refs = await lireServeur();
    memoriserReferentiels(refs);
    return { refs, horsLigne: false };
  } catch {
    return { refs: lireReferentielsEnCache(), horsLigne: true };
  }
}
