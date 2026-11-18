// Tâche « Articles dormants » (#147, ADR-0073, ADR-0113) : prix d'un article dormant republié avec une baisse.
// Fonctions pures, montants en centimes entiers.

export interface RegleBaisse {
  type: "pourcentage" | "montant";
  /** Pourcentage entier (10 = 10 %) ou montant en centimes. */
  valeur: number;
}

/** Réglage d'un article : celui du compte, le sien, ou « ne pas baisser le prix » (`aucune`). */
export type ReglageBaisseArticle = "compte" | "pourcentage" | "montant" | "aucune";

const PAS = 50;

function entier(valeur: number, nom: string) {
  if (!Number.isInteger(valeur)) throw new Error(`${nom} : centimes entiers attendus.`);
}

/** Division entière arrondie vers le haut (a ≥ 0, b > 0). */
function auDessus(a: number, b: number): number {
  const q = Math.floor(a / b);
  return q * b < a ? q + 1 : q;
}

/** Règle à appliquer : celle de l'article si elle est complète, « aucune » → null, sinon celle du compte. */
export function regleApplicable(
  article: { regle: ReglageBaisseArticle; valeur: number | null },
  compte: RegleBaisse,
): RegleBaisse | null {
  if (article.regle === "aucune") return null;
  if (article.regle === "compte" || article.valeur === null) return compte;
  return { type: article.regle, valeur: article.valeur };
}

/**
 * Prix de la republication avec baisse (ADR-0113) : arrondi vers le haut au 0,50 € ; baisse de 0,50 € si l'arrondi
 * redonne le prix actuel ; jamais sous le prix vente minimum. `null` = rien à faire : « ne pas baisser », pas de prix
 * vente minimum, ou déjà au minimum (l'article reste dans les dormants de l'écran « À faire »).
 */
export function prixRepublication(
  prixAffiche: number,
  regle: RegleBaisse | null,
  minimum: number | null,
): number | null {
  entier(prixAffiche, "Prix affiché");
  if (minimum !== null) entier(minimum, "Prix vente minimum");
  if (regle !== null) entier(regle.valeur, "Baisse");
  if (regle === null || minimum === null || prixAffiche <= minimum) return null;
  const arrondi =
    regle.type === "pourcentage"
      ? auDessus(prixAffiche * (100 - regle.valeur), 100 * PAS) * PAS
      : auDessus(Math.max(prixAffiche - regle.valeur, 0), PAS) * PAS;
  const baisse = arrondi >= prixAffiche ? prixAffiche - PAS : arrondi;
  const prix = Math.max(baisse, minimum);
  return prix <= 0 || prix >= prixAffiche ? null : prix;
}
