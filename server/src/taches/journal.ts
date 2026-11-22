// Refonte des tâches automatisées (#232, #233, ADR-0105) : état de chaque tâche (dernier et prochain passage, actions
// du jour), journal de toutes les tâches (actions des articles dormants, lectures des ventes finalisées) et sa
// conservation de 3 mois.
import { and, desc, eq, gte, inArray, lt, ne, or } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { actionVinted, article, commandeVinted, lectureCommandes, offreFavori, reglages } from "../base/schema.js";
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

export const TACHES = ["dormants", "finalisation", "favoris"] as const;
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
    f.tache === "finalisation" || f.tache === "favoris"
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
  // Offres aux favoris (#149) : une ligne par offre (hors « à valider »).
  const offres =
    f.tache === "finalisation" || f.tache === "dormants"
      ? []
      : await base
          .select({
            id: offreFavori.id,
            etat: offreFavori.etat,
            prixAvant: offreFavori.prixAvant,
            prixOffre: offreFavori.prixOffre,
            essai: offreFavori.essai,
            manuelle: offreFavori.manuelle,
            message: offreFavori.message,
            releve: offreFavori.releve,
            creeLe: offreFavori.creeLe,
            finLe: offreFavori.finLe,
            articleId: offreFavori.articleId,
            reference: article.reference,
            nom: article.nom,
          })
          .from(offreFavori)
          .innerJoin(article, eq(article.id, offreFavori.articleId))
          .where(
            and(
              eq(offreFavori.utilisateurId, utilisateurId),
              f.etat ? eq(offreFavori.etat, f.etat) : ne(offreFavori.etat, "a_valider"),
              gte(offreFavori.creeLe, limite),
            ),
          )
          .orderBy(desc(offreFavori.creeLe))
          .limit(2000);
  const lectures =
    f.tache === "dormants" || f.tache === "favoris" || (f.etat && !["faite", "essai", "erreur"].includes(f.etat))
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
    ...offres.map((o) => ({
      tache: "favoris" as const,
      id: o.id,
      etat: o.etat as EtatJournal,
      date: o.finLe ?? o.creeLe,
      essai: o.essai,
      manuelle: o.manuelle,
      message: o.message,
      releve: o.releve,
      action: {
        type: "offre" as const,
        prixAvant: o.prixAvant,
        prixApres: o.prixOffre,
        url: null,
        article: { id: o.articleId, reference: o.reference, nom: o.nom },
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

/** Offres aux favoris confiées à l'extension aujourd'hui (heure de Paris), comme le plafond du jour (#149). */
async function offresDuJour(base: Base, utilisateurId: string, maintenant: Date): Promise<number> {
  const recentes = await base
    .select({ debutLe: offreFavori.debutLe })
    .from(offreFavori)
    .where(
      and(
        eq(offreFavori.utilisateurId, utilisateurId),
        gte(offreFavori.debutLe, new Date(maintenant.getTime() - 2 * 86_400_000)),
      ),
    );
  const aujourdhui = jourParis(maintenant.toISOString());
  return recentes.filter((x) => x.debutLe && jourParis(x.debutLe.toISOString()) === aujourdhui).length;
}

/** État de chaque tâche (#232) : activée, essai, dernier et prochain passage automatique, actions du jour. */
export async function etatTaches(base: Base, utilisateurId: string, maintenant: Date) {
  const r = await lireReglages(base, utilisateurId);
  const [passages] = await base
    .select({
      dormants: reglages.dormantsDernierPassage,
      finalisation: reglages.finalisationDernierPassage,
      lancementDemande: reglages.finalisationLancementDemande,
      favoris: reglages.favorisDernierPassage,
      favorisLancementDemande: reglages.favorisLancementDemande,
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
        republications: du.filter((a) => a.type === "republication").length,
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
    favoris: {
      active: r.favorisActive,
      essai: r.favorisEssai,
      dernierPassage: passages?.favoris ?? null,
      prochainPassage: prochainPassage(
        {
          active: r.favorisActive,
          heureDebut: r.favorisHeureDebut,
          heureFin: r.favorisHeureFin,
          frequenceHeures: r.favorisFrequenceHeures,
          dernierPassage: passages?.favoris ?? null,
        },
        maintenant,
      ),
      lancementDemande: passages?.favorisLancementDemande ?? null,
      aujourdhui: { offres: await offresDuJour(base, utilisateurId, maintenant), plafond: r.favorisPlafond },
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
