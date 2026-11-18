// Tâches automatisées (#147, ADR-0072, ADR-0073, ADR-0078) : quand passer, et quelles actions prévoir sur les articles
// dormants. Fonctions pures ; le calcul du nouveau prix est dans calculs/baisse (règle n° 1).
import { prixRepublication, type ReglageBaisseArticle, type RegleBaisse, regleApplicable } from "../calculs/baisse.js";

/** Republications sans vente avant le statut « Invendu ». */
export const REPUBLICATIONS_AVANT_INVENDU = 3;

const HEURE_PARIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" });

export const heureParis = (instant: Date): number =>
  Number(HEURE_PARIS.formatToParts(instant).find((p) => p.type === "hour")?.value ?? "0");

/** La tâche passe-t-elle maintenant : activée, dans la plage horaire (heure de Paris), fréquence respectée ? */
export function passageDu(
  r: { active: boolean; heureDebut: number; heureFin: number; frequenceHeures: number; dernierPassage: Date | null },
  maintenant: Date,
): boolean {
  if (!r.active) return false;
  const heure = heureParis(maintenant);
  if (heure < r.heureDebut || heure >= r.heureFin) return false;
  return (
    r.dernierPassage === null || maintenant.getTime() - r.dernierPassage.getTime() >= r.frequenceHeures * 3_600_000
  );
}

/**
 * Prochain passage prévu d'une tâche activée (#232) : à sa fréquence après le dernier passage (maintenant s'il est déjà
 * dû), ramené au début de la plage horaire de Paris. Désactivée : aucun. L'extension le fait à son passage suivant.
 */
export function prochainPassage(
  r: { active: boolean; heureDebut: number; heureFin: number; frequenceHeures: number; dernierPassage: Date | null },
  maintenant: Date,
): Date | null {
  if (!r.active) return null;
  const du = r.dernierPassage === null ? 0 : r.dernierPassage.getTime() + r.frequenceHeures * 3_600_000;
  let instant = new Date(Math.max(maintenant.getTime(), du));
  const dansLaPlage = (d: Date) => heureParis(d) >= r.heureDebut && heureParis(d) < r.heureFin;
  if (dansLaPlage(instant)) return instant;
  // Les décalages de Paris sont des heures entières : la plage commune une heure ronde.
  instant = new Date(Math.ceil(instant.getTime() / 3_600_000) * 3_600_000);
  for (let i = 0; i < 48 && !dansLaPlage(instant); i++) instant = new Date(instant.getTime() + 3_600_000);
  return instant;
}

export interface CandidatDormant {
  id: string;
  prixAffiche: number | null;
  prixVenteMinimum: number | null;
  baisseRegle: ReglageBaisseArticle;
  baisseValeur: number | null;
  /** Lien de l'annonce : sans lui, l'extension ne peut pas agir. */
  urlVinted: string | null;
  /** Republications faites depuis la dernière arrivée En ligne. */
  republications: number;
  /** Une action est déjà prévue ou en cours pour cet article. */
  actionEnCours: boolean;
}

export interface ActionPrevue {
  articleId: string;
  /** Une seule action depuis ADR-0113 : republication avec baisse (« baisse » ne reste que dans l'historique). */
  type: "republication";
  prixAvant: number;
  prixApres: number;
}

/**
 * Actions du passage, dans l'ordre des candidats (les plus anciennement dormants d'abord), dans la limite du plafond
 * du jour : republication avec baisse (ADR-0113). Sans baisse possible (« ne pas baisser », pas de minimum, déjà au
 * minimum), rien ; les articles déjà republiés 3 fois passent « Invendu » au lieu d'une nouvelle action.
 */
export function planifierDormants(
  candidats: readonly CandidatDormant[],
  r: { regleCompte: RegleBaisse; plafondRepublications: number; dejaAujourdhui: number },
): { actions: ActionPrevue[]; invendus: string[] } {
  const actions: ActionPrevue[] = [];
  const invendus: string[] = [];
  let restant = r.plafondRepublications - r.dejaAujourdhui;
  for (const c of candidats) {
    if (c.actionEnCours) continue;
    if (c.republications >= REPUBLICATIONS_AVANT_INVENDU) {
      invendus.push(c.id);
      continue;
    }
    if (c.prixAffiche === null || !c.urlVinted) continue;
    const prix = prixRepublication(
      c.prixAffiche,
      regleApplicable({ regle: c.baisseRegle, valeur: c.baisseValeur }, r.regleCompte),
      c.prixVenteMinimum,
    );
    if (prix === null || restant <= 0) continue;
    restant -= 1;
    actions.push({ articleId: c.id, type: "republication", prixAvant: c.prixAffiche, prixApres: prix });
  }
  return { actions, invendus };
}
