// Libellés des statuts (§4.1). Les transitions possibles sont fournies par le serveur (source unique).
export type Statut = "brouillon" | "a_publier" | "en_ligne" | "a_expedier" | "envoye" | "finalise" | "sortie_stock";

export const LIBELLES_STATUT: Record<Statut, string> = {
  brouillon: "Brouillon",
  a_publier: "À publier",
  en_ligne: "En ligne",
  a_expedier: "À expédier",
  envoye: "Envoyé",
  finalise: "Finalisé",
  sortie_stock: "Sortie du stock",
};

/** Libellé du bouton qui fait passer un article à ce statut. */
export const ACTIONS_STATUT: Record<Statut, string> = {
  brouillon: "Repasser en brouillon",
  a_publier: "Marquer « À publier »",
  en_ligne: "Mettre en ligne",
  a_expedier: "Vendu : à expédier",
  envoye: "Marquer envoyé",
  finalise: "Finaliser",
  sortie_stock: "Sortir du stock",
};

export const formatReference = (reference: number) => `#${String(reference).padStart(4, "0")}`;
