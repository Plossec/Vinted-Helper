// Refonte des tâches automatisées (#232, #233, ADR-0105) : état de chaque tâche (dernier et prochain passage, actions
// du jour), journal de toutes les tâches (actions des articles dormants, lectures des ventes finalisées) et sa
// conservation de 3 mois.
import { and, desc, eq, gte, inArray, lt, ne, or } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { actionVinted, article, commandeVinted, lectureCommandes, reglages } from "../base/schema.js";
import { jourParis } from "../calculs/indicateurs.js";
import { lireReglages } from "../frais/service.js";
import { prochainPassage } from "../metier/taches.js";

export const MOIS_JOURNAL = 3;

/** Date avant laquelle une ligne du journal est effacée. */
export function limiteJournal(maintenant: Date): Date {
  const limite = new Date(maintenant);
  limite.setUTCMonth(limite.getUTCMonth() - MOIS_JOURNAL);
  return limite;
}

export const TACHES = ["dormants", "finalisation"] as const;
export type Tache = (typeof TACHES)[number];
/** États d'une ligne du journal : ceux des actions (hors « à valider ») ; une lecture est faite, essai ou erreur. */
export const ETATS_JOURNAL = ["en_attente", "en_cours", "faite", "essai", "erreur", "refusee", "annulee"] as const;
export type EtatJournal = (typeof ETATS_JOURNAL)[number];

export interface FiltresJournal {
  tache?: Tache;
  etat?: EtatJournal;
  /** AAAA-MM-JJ, jour de Paris. */
  jour?: string;
}

/** Lignes affichées au plus. */
const LIMITE_LIGNES = 200;

/**
 * Journal de toutes les tâches, le plus récent d'abord : une ligne par action des articles dormants (hors « à
 * valider ») et une par lecture des ventes finalisées, sur les 3 derniers mois.
 */
export async function listerJournal(base: Base, utilisateurId: string, f: FiltresJournal, maintenant: Date) {
  const limite = limiteJournal(maintenant);
  const actions =
    f.tache === "finalisation"
      ? []
      : await base
          .select({
            id: actionVinted.id,
            etat: actionVinted.etat,
            type: actionVinted.type,
            prixAvant: actionVinted.prixAvant,
            prixApres: actionVinted.prixApres,
            essai: actionVinted.essai,
            manuelle: actionVinted.manuelle,
            message: actionVinted.message,
            releve: actionVinted.releve,
            url: actionVinted.url,
            creeLe: actionVinted.creeLe,
            finLe: actionVinted.finLe,
            articleId: actionVinted.articleId,
            reference: article.reference,
            nom: article.nom,
          })
          .from(actionVinted)
          .innerJoin(article, eq(article.id, actionVinted.articleId))
          .where(
            and(
              eq(actionVinted.utilisateurId, utilisateurId),
              f.etat ? eq(actionVinted.etat, f.etat) : ne(actionVinted.etat, "a_valider"),
              gte(actionVinted.creeLe, limite),
            ),
          )
          .orderBy(desc(actionVinted.creeLe))
          .limit(2000);
  const lectures =
    f.tache === "dormants" || (f.etat && !["faite", "essai", "erreur"].includes(f.etat))
      ? []
      : await base
          .select()
          .from(lectureCommandes)
          .where(and(eq(lectureCommandes.utilisateurId, utilisateurId), gte(lectureCommandes.date, limite)))
          .orderBy(desc(lectureCommandes.date))
          .limit(2000);
  const lignes = [
    ...actions.map((a) => ({
      tache: "dormants" as const,
      id: a.id,
      etat: a.etat as EtatJournal,
      date: a.finLe ?? a.creeLe,
      essai: a.essai,
      manuelle: a.manuelle,
      message: a.message,
      releve: a.releve,
      action: {
        type: a.type,
        prixAvant: a.prixAvant,
        prixApres: a.prixApres,
        url: a.url,
        article: { id: a.articleId, reference: a.reference, nom: a.nom },
      },
    })),
    ...lectures
      .map((l) => ({
        tache: "finalisation" as const,
        id: l.id,
        etat: (l.erreur !== null ? "erreur" : l.essai ? "essai" : "faite") as EtatJournal,
        date: l.date,
        essai: l.essai,
        manuelle: l.manuelle,
        message: l.erreur,
        releve: l.releve,
        lecture: {
          lues: l.lues,
          nouvelles: l.nouvelles,
          finalisees: l.finalisees,
          aValider: l.aValider,
          aRattacher: l.aRattacher,
        },
      }))
      .filter((l) => !f.etat || l.etat === f.etat),
  ];
  return lignes
    .filter((l) => !f.jour || jourParis(l.date.toISOString()) === f.jour)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, LIMITE_LIGNES);
}

/** Finalisations faites aujourd'hui (heure de Paris), pour le plafond du jour. */
export async function finaliseesDuJour(
  base: Base | Transaction,
  utilisateurId: string,
  maintenant: Date,
): Promise<number> {
  const recentes = await base
    .select({ traiteLe: commandeVinted.traiteLe })
    .from(commandeVinted)
    .where(
      and(
        eq(commandeVinted.utilisateurId, utilisateurId),
        eq(commandeVinted.etat, "appliquee"),
        gte(commandeVinted.traiteLe, new Date(maintenant.getTime() - 2 * 86_400_000)),
      ),
    );
  const aujourdhui = jourParis(maintenant.toISOString());
  return recentes.filter((x) => x.traiteLe && jourParis(x.traiteLe.toISOString()) === aujourdhui).length;
}

/** État de chaque tâche (#232) : activée, essai, dernier et prochain passage automatique, actions du jour. */
export async function etatTaches(base: Base, utilisateurId: string, maintenant: Date) {
  const r = await lireReglages(base, utilisateurId);
  const [passages] = await base
    .select({
      dormants: reglages.dormantsDernierPassage,
      finalisation: reglages.finalisationDernierPassage,
      lancementDemande: reglages.finalisationLancementDemande,
    })
    .from(reglages)
    .where(eq(reglages.utilisateurId, utilisateurId));
  const aujourdhui = jourParis(maintenant.toISOString());
  const actions = await base
    .select({ type: actionVinted.type, creeLe: actionVinted.creeLe })
    .from(actionVinted)
    .where(
      and(
        eq(actionVinted.utilisateurId, utilisateurId),
        gte(actionVinted.creeLe, new Date(maintenant.getTime() - 2 * 86_400_000)),
        ne(actionVinted.etat, "refusee"),
        ne(actionVinted.etat, "annulee"),
      ),
    );
  const du = actions.filter((a) => jourParis(a.creeLe.toISOString()) === aujourdhui);
  const dernierDormants = passages?.dormants ?? null;
  const dernierFinalisation = passages?.finalisation ?? null;
  return {
    dormants: {
      active: r.dormantsActive,
      essai: r.dormantsEssai,
      dernierPassage: dernierDormants,
      prochainPassage: prochainPassage(
        {
          active: r.dormantsActive,
          heureDebut: r.dormantsHeureDebut,
          heureFin: r.dormantsHeureFin,
          frequenceHeures: r.dormantsFrequenceHeures,
          dernierPassage: dernierDormants,
        },
        maintenant,
      ),
      aujourdhui: {
        baisses: du.filter((a) => a.type === "baisse").length,
        republications: du.filter((a) => a.type === "republication").length,
        plafondBaisses: r.dormantsPlafondBaisses,
        plafondRepublications: r.dormantsPlafondRepublications,
      },
    },
    finalisation: {
      active: r.finalisationActive,
      essai: r.finalisationEssai,
      dernierPassage: dernierFinalisation,
      prochainPassage: prochainPassage(
        {
          active: r.finalisationActive,
          heureDebut: r.finalisationHeureDebut,
          heureFin: r.finalisationHeureFin,
          frequenceHeures: r.finalisationFrequenceHeures,
          dernierPassage: dernierFinalisation,
        },
        maintenant,
      ),
      lancementDemande: passages?.lancementDemande ?? null,
      aujourdhui: {
        finalisees: await finaliseesDuJour(base, utilisateurId, maintenant),
        plafond: r.finalisationPlafond,
      },
    },
  };
}

/**
 * Purge du jour (ADR-0105) : lignes du journal de plus de 3 mois effacées. Les republications faites sont gardées :
 * elles comptent pour les 3 republications avant « Invendu » (elles ne sont plus montrées). Les actions encore à faire
 * ne sont jamais effacées.
 */
export async function purgerJournalTaches(
  base: Base,
  maintenant: Date,
): Promise<{ actions: number; lectures: number }> {
  const limite = limiteJournal(maintenant);
  const actions = await base
    .delete(actionVinted)
    .where(
      and(
        lt(actionVinted.creeLe, limite),
        inArray(actionVinted.etat, ["faite", "essai", "erreur", "refusee", "annulee"]),
        or(ne(actionVinted.type, "republication"), ne(actionVinted.etat, "faite")),
      ),
    )
    .returning({ id: actionVinted.id });
  const lectures = await base
    .delete(lectureCommandes)
    .where(lt(lectureCommandes.date, limite))
    .returning({ id: lectureCommandes.id });
  return { actions: actions.length, lectures: lectures.length };
}
