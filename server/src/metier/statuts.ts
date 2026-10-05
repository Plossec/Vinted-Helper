// Statuts d'un article et transitions autorisées — cahier des charges §4.
// Source unique : le serveur calcule les transitions possibles et les transmet à l'interface.

export const STATUTS = [
  "brouillon",
  "a_publier",
  "en_ligne",
  "a_expedier",
  "envoye",
  "finalise",
  "sortie_stock",
] as const;

export type Statut = (typeof STATUTS)[number];

export const LIBELLES_STATUT: Record<Statut, string> = {
  brouillon: "Brouillon",
  a_publier: "À publier",
  en_ligne: "En ligne",
  a_expedier: "À expédier",
  envoye: "Envoyé",
  finalise: "Finalisé",
  sortie_stock: "Sortie du stock",
};

/** Tableau du §4.2 : statut actuel → statuts suivants autorisés. */
const TRANSITIONS: Record<Statut, readonly Statut[]> = {
  brouillon: ["a_publier", "en_ligne", "sortie_stock"],
  a_publier: ["en_ligne", "brouillon", "sortie_stock"],
  en_ligne: ["a_expedier", "a_publier", "sortie_stock"],
  a_expedier: ["envoye", "en_ligne", "sortie_stock"],
  envoye: ["finalise", "a_publier", "sortie_stock"],
  finalise: [],
  sortie_stock: ["a_publier"],
};

/**
 * Statuts vers lesquels l'application sait déjà faire passer un article.
 * Lot 1 : Brouillon, À publier, En ligne. Les passages qui créent une vente, concernent un colis
 * ou sortent l'article du stock arrivent au lot 3 (décision du 05/10/2026).
 */
export const STATUTS_DISPONIBLES: ReadonlySet<Statut> = new Set<Statut>(["brouillon", "a_publier", "en_ligne"]);

export function estStatut(valeur: unknown): valeur is Statut {
  return typeof valeur === "string" && (STATUTS as readonly string[]).includes(valeur);
}

export function transitionAutorisee(de: Statut, vers: Statut): boolean {
  return TRANSITIONS[de].includes(vers);
}

/** Transitions proposées à l'utilisateur : autorisées par le §4.2 et déjà disponibles dans l'application. */
export function transitionsProposees(de: Statut): Statut[] {
  return TRANSITIONS[de].filter((vers) => STATUTS_DISPONIBLES.has(vers));
}

export type ResultatTransition = { ok: true } | { ok: false; raison: string };

/** Vérifie un passage de statut, y compris le prix affiché obligatoire pour être En ligne (§4.2). */
export function verifierTransition(
  de: Statut,
  vers: Statut,
  article: { prixAffiche: number | null },
): ResultatTransition {
  if (!transitionAutorisee(de, vers)) {
    return { ok: false, raison: `Passage impossible de « ${LIBELLES_STATUT[de]} » à « ${LIBELLES_STATUT[vers]} ».` };
  }
  if (vers === "en_ligne" && (article.prixAffiche === null || article.prixAffiche <= 0)) {
    return { ok: false, raison: "Indiquez le prix affiché sur Vinted avant de passer l'article En ligne." };
  }
  return { ok: true };
}
