// Tâche « Offres reçues » (#150, ADR-0076) : l'extension lit les offres reçues (contre-offre, acceptation) via
// GET /api/v2/inbox + GET /api/v2/conversations/{id} ; l'application applique les règles : offre ≥ minimum → acceptée
// si l'article est dormant depuis au moins le délai réglable (compté comme l'alerte dormant : depuis la dernière
// baisse de prix ou la mise en ligne), sinon contre-offre à mi-chemin ; offre < minimum → contre-offre à mi-chemin ;
// sans minimum → offre signalée dans l'application (#191). La vente est créée quand l'offre est acceptée et payée
// (réutilisation de la lecture du Porte-monnaie, ADR-0097).
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, historiquePrix, historiqueStatut, offreRecue, reglages } from "../base/schema.js";
import type { OffreRecueLigne, OffreRecueLu, OffreRecueSuivante } from "../api/types.js";
import { chargerArticle } from "../articles/service.js";
import { passageDu } from "../metier/taches.js";
import { erreurSaisie, introuvable } from "../utilitaires/erreurs.js";

export type { OffreRecueLigne, OffreRecueLu, OffreRecueSuivante } from "../api/types.js";

/** Règle ADR-0076 appliquée à une offre reçue. */
export interface PlanOffre {
  etat: "accepter" | "contreOffre" | "signaler";
  /** Contre-offre prévue (centimes), à afficher dans « À faire » en mode manuel. */
  prixContreOffre: number | null;
}

/** Contre-offre à mi-chemin entre l'offre et le prix affiché, arrondie vers le haut au 0,50 €, jamais sous le minimum (#91). */
function contreOffre(prixOffre: number, prixAffiche: number, minimum: number): number {
  const milieu = Math.ceil((prixOffre + prixAffiche) / 2 / 50) * 50;
  return Math.min(Math.max(milieu, minimum), prixAffiche);
}

/**
 * Règles ADR-0076 : offre ≥ minimum → acceptée si l'article est dormant depuis au moins le délai réglable ; sinon
 * contre-offre à mi-chemin. Sans minimum → signalée (#191).
 */
export function planOffreRecue(
  a: { prixVenteMinimum: number | null; prixAffiche: number | null },
  o: Pick<OffreRecueLu, "prixOffre">,
  dormante: boolean,
): PlanOffre {
  if (a.prixAffiche === null) return { etat: "signaler", prixContreOffre: null };
  if (a.prixVenteMinimum === null) return { etat: "signaler", prixContreOffre: null };
  if (o.prixOffre >= a.prixVenteMinimum && dormante) return { etat: "accepter", prixContreOffre: null };
  return { etat: "contreOffre", prixContreOffre: contreOffre(o.prixOffre, a.prixAffiche, a.prixVenteMinimum) };
}

/** Dernier changement significatif de l'article : dernière mise en ligne ou dernière baisse de prix (ADR-0076). */
async function depuisActivite(base: Base, articleId: string): Promise<Date | null> {
  const [statut, prix] = await Promise.all([
    base
      .select({ date: historiqueStatut.date })
      .from(historiqueStatut)
      .where(and(eq(historiqueStatut.articleId, articleId), inArray(historiqueStatut.vers, ["en_ligne", "invendu"])))
      .orderBy(desc(historiqueStatut.date))
      .limit(1),
    base
      .select({ date: historiquePrix.date })
      .from(historiquePrix)
      .where(eq(historiquePrix.articleId, articleId))
      .orderBy(desc(historiquePrix.date))
      .limit(1),
  ]);
  const dates = [statut[0]?.date, prix[0]?.date].filter((d): d is Date => d !== undefined);
  return dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
}

/** Offres reçues envoyées par l'extension : lignes nouvelles, enregistrées avec la règle ADR-0076 (plan + état). */
export async function recevoirOffres(
  base: Base,
  utilisateurId: string,
  offres: OffreRecueLu[],
  maintenant: Date,
): Promise<{ nouvelles: number; ignores: string[] }> {
  return base.transaction(async (tx) => {
    const [r] = await tx.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
    if (!r) throw introuvable("Réglages");
    const ignores: string[] = [];
    let nouvelles = 0;
    for (const o of offres) {
      let a;
      try {
        a = await chargerArticle(tx, utilisateurId, o.articleId);
      } catch {
        ignores.push(`Offre « ${o.offreId} » : article inconnu.`);
        continue;
      }
      if (
        (
          await tx
            .select({ id: offreRecue.id })
            .from(offreRecue)
            .where(and(eq(offreRecue.articleId, a.id), eq(offreRecue.offreId, o.offreId)))
        ).length > 0
      ) {
        ignores.push(`Offre « ${o.offreId} » : déjà connue.`);
        continue;
      }
      const depuis = await depuisActivite(tx, a.id);
      const dormante =
        depuis !== null && maintenant.getTime() - depuis.getTime() >= r.offresRecuesDelaiJours * 86_400_000;
      const plan = planOffreRecue({ prixVenteMinimum: a.prixVenteMinimum, prixAffiche: a.prixAffiche }, o, dormante);
      await tx.insert(offreRecue).values({
        utilisateurId,
        articleId: a.id,
        offreId: o.offreId,
        transactionId: o.transactionId,
        offerRequestId: o.offerRequestId,
        prixOffre: o.prixOffre,
        depuis: new Date(o.depuis),
        etat: plan.etat === "signaler" ? "signale" : r.offresRecuesMode === "automatique" ? "en_attente" : "a_valider",
        prixContreOffre: plan.prixContreOffre,
        message: plan.etat === "signaler" ? "Offre reçue sans minimum vendeur : rien à faire sur Vinted." : null,
        essai: r.offresRecuesEssai,
        creeLe: maintenant,
      });
      nouvelles++;
    }
    return { nouvelles, ignores };
  });
}

/** Offres reçues à valider (mode manuel) et signalées (sans minimum) : la liste de l'écran « À faire ». */
export async function offresAValuer(base: Base, utilisateurId: string): Promise<OffreRecueLigne[]> {
  const lignes = await base
    .select({
      id: offreRecue.id,
      articleId: offreRecue.articleId,
      reference: article.reference,
      nom: article.nom,
      prixOffre: offreRecue.prixOffre,
      prixContreOffre: offreRecue.prixContreOffre,
      depuis: offreRecue.depuis,
      message: offreRecue.message,
    })
    .from(offreRecue)
    .innerJoin(article, eq(article.id, offreRecue.articleId))
    .where(and(eq(offreRecue.utilisateurId, utilisateurId), inArray(offreRecue.etat, ["a_valider", "signale"])))
    .orderBy(desc(offreRecue.creeLe));
  return lignes.map((l) => ({ ...l, depuis: l.depuis.toISOString() }));
}

/** « Appliquer » (→ en attente de l'extension) des offres reçues à valider en mode manuel. */
export async function validerOffresRecues(base: Base, utilisateurId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) throw erreurSaisie("Cochez au moins une offre.");
  return base
    .update(offreRecue)
    .set({ etat: "en_attente", manuelle: false })
    .where(
      and(eq(offreRecue.utilisateurId, utilisateurId), inArray(offreRecue.id, ids), eq(offreRecue.etat, "a_valider")),
    )
    .returning({ id: offreRecue.id })
    .then((lignes) => lignes.length);
}

/** La lecture des offres est-elle due : « Lancer maintenant » (à toute heure), ou tâche activée, dans la plage et à sa fréquence ? */
export async function lectureOffresRecuesDue(base: Base, utilisateurId: string, maintenant: Date): Promise<boolean> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (!r) return false;
  return passageDu(
    {
      active: r.offresRecuesActive,
      heureDebut: r.offresRecuesHeureDebut,
      heureFin: r.offresRecuesHeureFin,
      frequenceHeures: r.offresRecuesFrequenceHeures,
      dernierPassage: r.offresRecuesDernierPassage,
    },
    maintenant,
  );
}

/** « Lancer maintenant » : la lecture des offres est demandée, faite au prochain passage, à toute heure. */
export async function lancerOffresRecues(base: Base, utilisateurId: string, maintenant: Date): Promise<void> {
  await base
    .update(reglages)
    .set({ offresRecuesDernierPassage: maintenant })
    .where(eq(reglages.utilisateurId, utilisateurId));
}

/**
 * Passage : la prochaine offre reçue faite sans validation (automatique), confiée à l'extension
 * (un passage à la fois, plage horaire et pause réglés à l'application, ADR-0078).
 */
export async function offreRecueSuivante(
  base: Base,
  utilisateurId: string,
  maintenant: Date,
): Promise<OffreRecueSuivante | null> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (
    !r ||
    !passageDu(
      {
        active: r.offresRecuesActive,
        heureDebut: r.offresRecuesHeureDebut,
        heureFin: r.offresRecuesHeureFin,
        frequenceHeures: r.offresRecuesFrequenceHeures,
        dernierPassage: r.offresRecuesDernierPassage,
      },
      maintenant,
    )
  )
    return null;
  await base
    .update(reglages)
    .set({ offresRecuesDernierPassage: maintenant })
    .where(eq(reglages.utilisateurId, utilisateurId));
  const [offre] = await base
    .select({
      id: offreRecue.id,
      articleId: offreRecue.articleId,
      offreId: offreRecue.offreId,
      transactionId: offreRecue.transactionId,
      offerRequestId: offreRecue.offerRequestId,
      reference: article.reference,
      nom: article.nom,
      prixOffre: offreRecue.prixOffre,
      prixContreOffre: offreRecue.prixContreOffre,
    })
    .from(offreRecue)
    .innerJoin(article, eq(article.id, offreRecue.articleId))
    .where(and(eq(offreRecue.utilisateurId, utilisateurId), eq(offreRecue.etat, "en_attente")))
    .orderBy(asc(offreRecue.creeLe));
  if (!offre) return null;
  await base.update(offreRecue).set({ debutLe: maintenant }).where(eq(offreRecue.id, offre.id));
  return { ...offre, reference: offre.reference ?? 0 };
}

export type ResultatOffreRecue = { resultat: "faite" } | { resultat: "erreur"; message: string; releve?: boolean };

/** Résultat renvoyé par l'extension : faite (offre acceptée, attendue la lecture du Porte-mon laboratories), erreur. */
export async function enregistrerResultatOffreRecue(
  base: Base,
  utilisateurId: string,
  id: string,
  r: ResultatOffreRecue,
  maintenant: Date,
): Promise<{ id: string } | null> {
  const [x] = await base
    .update(offreRecue)
    .set({
      etat: r.resultat,
      finLe: maintenant,
      message: r.resultat === "erreur" ? r.message : null,
      releve: r.resultat === "erreur" && r.releve === true,
    })
    .where(
      and(eq(offreRecue.id, id), eq(offreRecue.utilisateurId, utilisateurId), inArray(offreRecue.etat, ["en_attente"])),
    )
    .returning({ id: offreRecue.id });
  return x ?? null;
}
