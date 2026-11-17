// Alertes (§5.8) renvoyées par le serveur : à expédier, à récupérer, publications Vinted en erreur (#72), articles
// À publier incomplets (#196), brouillons trop anciens, articles dormants. Affichées par l'écran « À faire » (#191) ; leur nombre fait la pastille de l'onglet.
import type { Alerte, AlertesServeur } from "../api.js";

export type { Alerte, AlertesServeur };

/** Nombre de choses à faire venant des commandes lues sur Vinted (#148). */
export const nombreCommandes = (a: AlertesServeur | null) =>
  a?.commandes ? a.commandes.aValider + a.commandes.aRattacher + a.commandes.montantsCorriges : 0;

export const nombreAlertes = (a: AlertesServeur | null) =>
  a
    ? a.brouillons.length +
      a.dormants.length +
      a.aExpedier.length +
      (a.aRecuperer?.length ?? 0) +
      (a.erreursPublication?.length ?? 0) +
      (a.incomplets?.length ?? 0) +
      (a.invendus?.length ?? 0) +
      (a.aValider ?? 0) +
      nombreCommandes(a)
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
