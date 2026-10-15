// Alertes (§5.8) renvoyées par le serveur : à expédier, à récupérer, publications Vinted en erreur (#72), articles
// À publier incomplets (#196), brouillons trop anciens, articles dormants. Affichées par l'écran « À faire » (#191) ; leur nombre fait la pastille de l'onglet.

export interface Alerte {
  id: string;
  reference: number;
  nom: string | null;
  depuis: string;
  jours: number;
  /** Articles à expédier : lien de la conversation Vinted avec l'acheteur (issue #48). */
  urlConversation?: string | null;
  /** Articles à expédier : leur vente (bouton « Envoyé », #191). */
  venteId?: string | null;
  /** Articles À publier incomplets : ce qui manque à l'annonce (#196). */
  manques?: string[];
}

export interface AlertesServeur {
  brouillons: Alerte[];
  dormants: Alerte[];
  aExpedier: Alerte[];
  /** Retours à aller chercher (issue #52). */
  aRecuperer?: Alerte[];
  /** Publications Vinted en échec (issue #72). */
  erreursPublication?: Alerte[];
  /** Articles À publier incomplets (#196). */
  incomplets?: Alerte[];
  /** Dormants republiés 3 fois sans vente (#147). */
  invendus?: Alerte[];
}

export const nombreAlertes = (a: AlertesServeur | null) =>
  a
    ? a.brouillons.length +
      a.dormants.length +
      a.aExpedier.length +
      (a.aRecuperer?.length ?? 0) +
      (a.erreursPublication?.length ?? 0) +
      (a.incomplets?.length ?? 0) +
      (a.invendus?.length ?? 0)
    : 0;

/** Groupe d'alertes du serveur (clé de `AlertesServeur`). */
export type TypeAlerte =
  "erreursPublication" | "aExpedier" | "aRecuperer" | "incomplets" | "invendus" | "dormants" | "brouillons";

/** Une ligne de l'écran « À faire » : une alerte et son type. */
export interface LigneAFaire extends Alerte {
  type: TypeAlerte;
}

export interface SectionAFaire {
  titre: "Urgent" | "À traiter" | "Pour info";
  lignes: LigneAFaire[];
}

/** Ordre de l'écran « À faire » (#191), par urgence ; les sections vides ne sont pas renvoyées. */
const ORDRE: readonly { titre: SectionAFaire["titre"]; types: readonly TypeAlerte[] }[] = [
  { titre: "Urgent", types: ["erreursPublication"] },
  { titre: "À traiter", types: ["aExpedier", "aRecuperer", "incomplets", "invendus"] },
  { titre: "Pour info", types: ["dormants", "brouillons"] },
];

export function sectionsAFaire(alertes: AlertesServeur): SectionAFaire[] {
  return ORDRE.map(({ titre, types }) => ({
    titre,
    lignes: types.flatMap((type) => (alertes[type] ?? []).map((a) => ({ ...a, type }))),
  })).filter((s) => s.lignes.length > 0);
}
