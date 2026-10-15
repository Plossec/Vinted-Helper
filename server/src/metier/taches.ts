// Tâches automatisées (#147, ADR-0072, ADR-0073, ADR-0078) : quand passer, et quelles actions prévoir sur les articles
// dormants. Fonctions pures ; le calcul du nouveau prix est dans calculs/baisse (règle n° 1).
import { actionDormant, type ReglageBaisseArticle, type RegleBaisse, regleApplicable } from "../calculs/baisse.js";

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
  type: "baisse" | "republication";
  prixAvant: number;
  prixApres: number | null;
}

/**
 * Actions du passage, dans l'ordre des candidats (les plus anciennement dormants d'abord), dans la limite des
 * plafonds du jour ; les articles déjà republiés 3 fois passent « Invendu » au lieu d'une nouvelle action.
 */
export function planifierDormants(
  candidats: readonly CandidatDormant[],
  r: {
    regleCompte: RegleBaisse;
    plafondBaisses: number;
    plafondRepublications: number;
    dejaAujourdhui: { baisse: number; republication: number };
  },
): { actions: ActionPrevue[]; invendus: string[] } {
  const actions: ActionPrevue[] = [];
  const invendus: string[] = [];
  const restant = {
    baisse: r.plafondBaisses - r.dejaAujourdhui.baisse,
    republication: r.plafondRepublications - r.dejaAujourdhui.republication,
  };
  for (const c of candidats) {
    if (c.actionEnCours) continue;
    if (c.republications >= REPUBLICATIONS_AVANT_INVENDU) {
      invendus.push(c.id);
      continue;
    }
    if (c.prixAffiche === null || !c.urlVinted) continue;
    const action = actionDormant(
      c.prixAffiche,
      regleApplicable({ regle: c.baisseRegle, valeur: c.baisseValeur }, r.regleCompte),
      c.prixVenteMinimum,
    );
    if (restant[action.type] <= 0) continue;
    restant[action.type] -= 1;
    actions.push({
      articleId: c.id,
      type: action.type,
      prixAvant: c.prixAffiche,
      prixApres: action.type === "baisse" ? action.prix : null,
    });
  }
  return { actions, invendus };
}
