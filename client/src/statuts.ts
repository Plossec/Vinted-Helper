// Libellés des statuts (§4.1). Les transitions possibles sont fournies par le serveur (source unique).
export type Statut =
  | "brouillon"
  | "en_stock"
  | "a_publier"
  | "erreur_publication"
  | "en_ligne"
  | "a_expedier"
  | "envoye"
  | "a_recuperer"
  | "finalise"
  | "sortie_stock";

export const LIBELLES_STATUT: Record<Statut, string> = {
  brouillon: "Brouillon",
  en_stock: "En stock",
  a_publier: "À publier",
  erreur_publication: "Erreur",
  en_ligne: "En ligne",
  a_expedier: "À expédier",
  envoye: "Envoyé",
  a_recuperer: "À récupérer",
  finalise: "Finalisé",
  sortie_stock: "Sortie du stock",
};

/** Libellé du bouton qui fait passer un article à ce statut. */
export const ACTIONS_STATUT: Record<Statut, string> = {
  brouillon: "Repasser en brouillon",
  en_stock: "Garder en stock",
  a_publier: "Marquer « À publier »",
  // Jamais proposé : seule une publication Vinted en échec fait passer l'article en Erreur (#72).
  erreur_publication: "Erreur de publication",
  en_ligne: "Mettre en ligne",
  a_expedier: "Vendu : à expédier",
  envoye: "Marquer envoyé",
  a_recuperer: "Retour de l'acheteur",
  finalise: "Finaliser",
  sortie_stock: "Sortir du stock",
};

export const formatReference = (reference: number) => `#${String(reference).padStart(4, "0")}`;

/** Statuts avant la vente : la fiche, les photos et l'annonce sont au premier plan (#98). */
export const AVANT_VENTE: ReadonlySet<Statut> = new Set<Statut>(["brouillon", "a_publier", "erreur_publication"]);

/**
 * Prochaine étape d'un article (#98) : conseil affiché en tête de la fiche et passage mis en avant (bouton plein) ;
 * `vers` null : rien à faire (Finalisé, Sortie du stock) ou action hors des boutons de statut (publication Vinted).
 */
export function etapeSuivante(statut: Statut): { conseil: string; vers: Statut | null } {
  switch (statut) {
    case "en_stock":
      return {
        conseil: "Gardé en stock, hors vente : à remettre « À publier » le jour où il doit être vendu.",
        vers: null,
      };
    case "brouillon":
      return {
        conseil: "Compléter la fiche, les photos et l'annonce, puis la marquer « À publier ».",
        vers: "a_publier",
      };
    case "a_publier":
      return {
        conseil: "Publier sur Vinted (bloc Vinted), ou la mettre en ligne si elle est publiée à la main.",
        vers: "en_ligne",
      };
    case "erreur_publication":
      return { conseil: "La publication a échoué : corriger puis revenir à « À publier ».", vers: "a_publier" };
    case "en_ligne":
      return { conseil: "En vente sur Vinted : dès qu'elle est vendue, saisir la vente.", vers: "a_expedier" };
    case "a_expedier":
      return { conseil: "Préparer le colis et l'envoyer.", vers: "envoye" };
    case "envoye":
      return { conseil: "Finaliser dès que Vinted a versé l'argent.", vers: "finalise" };
    case "a_recuperer":
      return { conseil: "Récupérer l'article retourné, puis le remettre en vente.", vers: "en_ligne" };
    case "finalise":
      return { conseil: "Vente terminée.", vers: null };
    case "sortie_stock":
      return { conseil: "Article sorti du stock.", vers: null };
  }
}
