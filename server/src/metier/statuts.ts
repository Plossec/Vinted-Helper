// Statuts d'un article et transitions autorisées — cahier des charges §4.
// Source unique : le serveur calcule les transitions possibles et les transmet à l'interface.

export const STATUTS = [
  "brouillon",
  "a_publier",
  "en_ligne",
  "a_expedier",
  "envoye",
  /** Retour de l'acheteur : l'article est à aller chercher (issue #52). */
  "a_recuperer",
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
  a_recuperer: "À récupérer",
  finalise: "Finalisé",
  sortie_stock: "Sortie du stock",
};

/** Tableau du §4.2 : statut actuel → statuts suivants autorisés. */
const TRANSITIONS: Record<Statut, readonly Statut[]> = {
  brouillon: ["a_publier", "en_ligne", "sortie_stock"],
  a_publier: ["en_ligne", "brouillon", "sortie_stock"],
  en_ligne: ["a_expedier", "a_publier", "sortie_stock"],
  a_expedier: ["envoye", "en_ligne", "sortie_stock"],
  // Retour de l'acheteur : Envoyé → À récupérer (issue #52, au lieu d'À publier).
  envoye: ["finalise", "a_recuperer", "sortie_stock"],
  a_recuperer: ["a_publier", "en_ligne", "sortie_stock"],
  finalise: [],
  sortie_stock: ["a_publier"],
};

/**
 * Passages faits par le simple changement de statut (bouton + date). Les autres passages ont leur propre action
 * (décision du 06/10/2026) : la vente (En ligne → À expédier), le colis (envoi, finalisation, annulation, retour)
 * et la sortie du stock (et son annulation).
 */
const TRANSITIONS_SIMPLES = new Set<string>([
  "brouillon>a_publier",
  "brouillon>en_ligne",
  "a_publier>en_ligne",
  "a_publier>brouillon",
  "en_ligne>a_publier",
  "a_recuperer>a_publier",
  "a_recuperer>en_ligne",
]);

export function estTransitionSimple(de: Statut, vers: Statut): boolean {
  return TRANSITIONS_SIMPLES.has(`${de}>${vers}`);
}

/** Statuts « en vente » : l'article fait partie d'un colis en cours. */
export const STATUTS_COLIS: ReadonlySet<Statut> = new Set<Statut>(["a_expedier", "envoye"]);

export function estStatut(valeur: unknown): valeur is Statut {
  return typeof valeur === "string" && (STATUTS as readonly string[]).includes(valeur);
}

export function transitionAutorisee(de: Statut, vers: Statut): boolean {
  return TRANSITIONS[de].includes(vers);
}

/** Transitions proposées à l'utilisateur : celles du §4.2 (l'interface choisit l'action adaptée à chacune). */
export function transitionsProposees(de: Statut): Statut[] {
  return [...TRANSITIONS[de]];
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
