// Tâche « Offres aux favoris » (#149, ADR-0075, ADR-0114, ADR-0123), étape 2 : l'extension lit les notifications
// « … a marqué ton article … comme favori » ; chaque favori d'un article En ligne ou Invendu devient une offre réduite
// (une seule par personne et par article), envoyée par l'extension quand l'article est publié depuis au moins N jours
// (#295), une à la fois,
// dans la plage horaire, la pause et le plafond du jour. La personne n'est connue que par une empreinte (ADR-0100).
import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { actionVinted, article, historiqueStatut, offreFavori, reglages } from "../base/schema.js";
import { jourParis } from "../calculs/indicateurs.js";
import { prixRepublication, regleApplicable } from "../calculs/baisse.js";
import { heureParis, passageDu } from "../metier/taches.js";
import { conflit, erreurSaisie, introuvable } from "../utilitaires/erreurs.js";
import { centimesVersSaisie } from "../utilitaires/format.js";

/** Un favori lu dans les notifications de Vinted. */
export interface FavoriLu {
  /** Empreinte SHA-256 (hexadécimal) du pseudo Vinted de la personne, calculée par l'extension. */
  personne: string;
  /** Titre de l'annonce tel qu'écrit dans la notification. */
  titre: string;
  /** Date du favori, déduite de « il y a 3 jours ». */
  depuis: Date;
  /** Lien de la notification (conversation, « Faire une offre ») : https Vinted, sinon null (#326). */
  lien: string | null;
}

const STATUTS_OFFRE = ["en_ligne", "invendu"] as const;
/** Au-delà, une offre restée « en cours » est considérée interrompue (Chrome fermé, extension rechargée). */
const DELAI_INTERRUPTION_MS = 15 * 60_000;
const JOUR_MS = 86_400_000;

const normaliserTitre = (t: string) => t.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

/** Lecture des favoris due : « Lancer maintenant » (à toute heure), ou tâche activée, dans la plage et à sa fréquence. */
export async function lectureFavorisDue(base: Base, utilisateurId: string, maintenant: Date): Promise<boolean> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (!r) return false;
  if (r.favorisLancementDemande) return true;
  return passageDu(
    {
      active: r.favorisActive,
      heureDebut: r.favorisHeureDebut,
      heureFin: r.favorisHeureFin,
      frequenceHeures: r.favorisFrequenceHeures,
      dernierPassage: r.favorisDernierPassage,
    },
    maintenant,
  );
}

/** « Lancer maintenant » : la lecture des favoris est faite au prochain passage de l'extension, à toute heure. */
export async function lancerFavoris(base: Base, utilisateurId: string, maintenant: Date): Promise<void> {
  await base
    .update(reglages)
    .set({ favorisLancementDemande: maintenant })
    .where(eq(reglages.utilisateurId, utilisateurId));
}

/** Prix de l'offre (centimes) : règle de baisse des dormants (celle de l'article, sinon celle du compte), sinon null. */
function prixOffre(
  a: { prixAffiche: number | null; prixVenteMinimum: number | null; baisseRegle: string; baisseValeur: number | null },
  r: typeof reglages.$inferSelect,
): number | null {
  if (a.prixAffiche === null) return null;
  const regle = regleApplicable(
    { regle: a.baisseRegle as "compte" | "pourcentage" | "montant" | "aucune", valeur: a.baisseValeur },
    { type: r.dormantsBaisseType, valeur: r.dormantsBaisseValeur },
  );
  return prixRepublication(a.prixAffiche, regle, a.prixVenteMinimum);
}

/** Articles En ligne ou Invendu dont l'annonce porte ce titre (titre comparé sans tenir compte de la casse). */
async function articlesDuTitre(tx: Transaction | Base, utilisateurId: string) {
  return tx
    .select({
      id: article.id,
      titre: article.titreAnnonce,
      statut: article.statut,
      prixAffiche: article.prixAffiche,
      prixVenteMinimum: article.prixVenteMinimum,
      baisseRegle: article.baisseRegle,
      baisseValeur: article.baisseValeur,
    })
    .from(article)
    .where(
      and(
        eq(article.utilisateurId, utilisateurId),
        inArray(article.statut, [...STATUTS_OFFRE]),
        isNull(article.supprimeLe),
      ),
    );
}

/** Republication d'un article dormant prévue ou en cours : prioritaire sur l'offre (ADR-0114). */
async function republicationsEnCours(tx: Transaction | Base, utilisateurId: string): Promise<Set<string>> {
  const r = await tx
    .select({ articleId: actionVinted.articleId })
    .from(actionVinted)
    .where(
      and(
        eq(actionVinted.utilisateurId, utilisateurId),
        inArray(actionVinted.etat, ["a_valider", "en_attente", "en_cours"]),
      ),
    );
  return new Set(r.map((x) => x.articleId));
}

/**
 * Favoris lus par l'extension (#149). Chaque favori retrouvé (titre identique, un seul article En ligne ou Invendu)
 * devient une offre, à valider en mode manuel, sinon en attente de l'extension. Ignorés : déjà une offre pour cette
 * personne et cet article, titre absent ou en double, pas de prix d'offre possible. En mode essai, les offres sont
 * créées aussi : l'extension remplit l'offre sans l'envoyer. La lecture compte comme un passage.
 */
export async function recevoirFavoris(
  base: Base,
  utilisateurId: string,
  d: { favoris: FavoriLu[]; erreur: string | null },
  maintenant: Date,
): Promise<{ lus: number; nouvelles: number; ignores: string[]; dues: number }> {
  const bilan = await base.transaction(async (tx) => {
    const [r] = await tx.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
    if (!r) throw introuvable("Réglages");
    await tx
      .update(reglages)
      .set({ favorisDernierPassage: maintenant, favorisLancementDemande: null })
      .where(eq(reglages.utilisateurId, utilisateurId));
    if (d.erreur !== null) return { lus: 0, nouvelles: 0, ignores: [] as string[] };
    const articles = await articlesDuTitre(tx, utilisateurId);
    const dormants = await republicationsEnCours(tx, utilisateurId);
    const ignores: string[] = [];
    let nouvelles = 0;
    for (const f of d.favoris) {
      const candidats = articles.filter(
        (a) => a.titre !== null && normaliserTitre(a.titre) === normaliserTitre(f.titre),
      );
      if (candidats.length !== 1 || !candidats[0]) {
        ignores.push(
          candidats.length === 0
            ? `« ${f.titre} » : aucun article En ligne ou Invendu avec ce titre`
            : `« ${f.titre} » : plusieurs articles avec ce titre, aucune offre`,
        );
        continue;
      }
      const a = candidats[0];
      if (dormants.has(a.id)) {
        ignores.push(`« ${f.titre} » : republication de l'article dormant prévue, prioritaire`);
        continue;
      }
      const prix = prixOffre(a, r);
      if (prix === null || a.prixAffiche === null) {
        ignores.push(
          `« ${f.titre} » : pas de prix d'offre (sans prix vente minimum, « ne pas baisser » ou déjà au minimum)`,
        );
        continue;
      }
      const insertion = tx.insert(offreFavori).values({
        utilisateurId,
        articleId: a.id,
        personne: f.personne,
        favoriLe: f.depuis,
        lien: f.lien,
        etat: r.favorisMode === "automatique" ? "en_attente" : "a_valider",
        prixAvant: a.prixAffiche,
        prixOffre: prix,
        essai: r.favorisEssai,
        creeLe: maintenant,
      });
      // Offre déjà prévue sans lien (avant #326) ou annulée faute de notification retrouvée : elle reçoit le lien et
      // repart (une seule offre par personne et par article ; jamais une offre faite, en essai, refusée ou en cours).
      const creees = f.lien
        ? await insertion
            .onConflictDoUpdate({
              target: [offreFavori.articleId, offreFavori.personne],
              set: {
                lien: f.lien,
                etat: r.favorisMode === "automatique" ? "en_attente" : "a_valider",
                message: null,
                finLe: null,
              },
              setWhere: sql`${offreFavori.lien} is null and ${offreFavori.etat} in ('a_valider', 'en_attente', 'erreur', 'annulee')`,
            })
            .returning({ id: offreFavori.id })
        : await insertion.onConflictDoNothing().returning({ id: offreFavori.id });
      nouvelles += creees.length;
    }
    return { lus: d.favoris.length, nouvelles, ignores };
  });
  // Offres dues maintenant (article publié depuis le délai) : dites au journal de l'extension (#314).
  return { ...bilan, dues: await nombreOffresDues(base, utilisateurId, maintenant) };
}

/**
 * Date de publication de chaque article (#295) : dernière mise en ligne (historique des statuts) ou dernière
 * republication faite par la tâche « Articles dormants » (nouvelle annonce sur Vinted). Inconnue : article absent.
 */
async function datesPublication(tx: Transaction | Base, articleIds: readonly string[]): Promise<Map<string, number>> {
  const dates = new Map<string, number>();
  if (articleIds.length === 0) return dates;
  const noter = (id: string, d: Date | null) => {
    if (d && d.getTime() > (dates.get(id) ?? 0)) dates.set(id, d.getTime());
  };
  const [statuts, republications] = await Promise.all([
    tx
      .select({ articleId: historiqueStatut.articleId, date: historiqueStatut.date })
      .from(historiqueStatut)
      .where(and(inArray(historiqueStatut.articleId, [...articleIds]), eq(historiqueStatut.vers, "en_ligne"))),
    tx
      .select({ articleId: actionVinted.articleId, date: actionVinted.finLe })
      .from(actionVinted)
      .where(
        and(
          inArray(actionVinted.articleId, [...articleIds]),
          eq(actionVinted.type, "republication"),
          eq(actionVinted.etat, "faite"),
        ),
      ),
  ]);
  for (const s of statuts) noter(s.articleId, s.date);
  for (const a of republications) noter(a.articleId, a.date);
  // Sans passage « En ligne » connu (#314) : la date d'achat sert de date de publication (sinon l'offre ne serait
  // jamais due).
  const sansDate = articleIds.filter((id) => !dates.has(id));
  if (sansDate.length > 0) {
    const achats = await tx
      .select({ id: article.id, dateAchat: article.dateAchat })
      .from(article)
      .where(inArray(article.id, sansDate));
    for (const a of achats) if (a.dateAchat) noter(a.id, new Date(`${a.dateAchat}T00:00:00.000Z`));
  }
  return dates;
}

/** Offre due (#295) : article publié depuis au moins le délai réglé (et non plus N jours après le favori). */
const publieDepuisDelai = (dates: Map<string, number>, articleId: string, delaiJours: number, maintenant: Date) =>
  (dates.get(articleId) ?? Number.POSITIVE_INFINITY) <= maintenant.getTime() - delaiJours * JOUR_MS;

/** Offres en attente de l'extension et dues (article publié depuis le délai), pour le passage de l'extension. */
export async function nombreOffresDues(base: Base, utilisateurId: string, maintenant: Date): Promise<number> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (!r) return 0;
  const lignes = await base
    .select({ articleId: offreFavori.articleId })
    .from(offreFavori)
    .where(and(eq(offreFavori.utilisateurId, utilisateurId), eq(offreFavori.etat, "en_attente")));
  const dates = await datesPublication(base, [...new Set(lignes.map((l) => l.articleId))]);
  return lignes.filter((l) => publieDepuisDelai(dates, l.articleId, r.favorisDelaiJours, maintenant)).length;
}

/** Offres confiées à l'extension aujourd'hui (heure de Paris), pour le plafond du jour. */
async function offresEnvoyeesDuJour(tx: Transaction, utilisateurId: string, maintenant: Date): Promise<number> {
  const recentes = await tx
    .select({ debutLe: offreFavori.debutLe })
    .from(offreFavori)
    .where(
      and(
        eq(offreFavori.utilisateurId, utilisateurId),
        gte(offreFavori.debutLe, new Date(maintenant.getTime() - 2 * JOUR_MS)),
      ),
    );
  const aujourdhui = jourParis(maintenant.toISOString());
  return recentes.filter((x) => x.debutLe && jourParis(x.debutLe.toISOString()) === aujourdhui).length;
}

/**
 * Offre suivante pour l'extension, passée « en cours » : une à la fois, dans la plage horaire, après la pause réglée,
 * dans le plafond du jour, délai après le favori écoulé, la plus ancienne d'abord. Le prix est recalculé (le prix
 * affiché a pu changer) ; un article qui n'est plus En ligne ou Invendu, ou sans prix d'offre, annule l'offre.
 */
export async function offreSuivante(base: Base, utilisateurId: string, maintenant: Date) {
  return base.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`offres:${utilisateurId}`}))`);
    await tx
      .update(offreFavori)
      .set({
        etat: "erreur",
        finLe: maintenant,
        message: "Offre interrompue (Chrome fermé ou extension rechargée) : vérifiez la conversation sur Vinted.",
      })
      .where(
        and(
          eq(offreFavori.utilisateurId, utilisateurId),
          eq(offreFavori.etat, "en_cours"),
          lt(offreFavori.debutLe, new Date(maintenant.getTime() - DELAI_INTERRUPTION_MS)),
        ),
      );
    const [enCours] = await tx
      .select({ id: offreFavori.id })
      .from(offreFavori)
      .where(and(eq(offreFavori.utilisateurId, utilisateurId), eq(offreFavori.etat, "en_cours")));
    if (enCours) return null;
    const [r] = await tx.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
    if (!r) return null;
    const heure = heureParis(maintenant);
    if (heure < r.favorisHeureDebut || heure >= r.favorisHeureFin) return null;
    if ((await offresEnvoyeesDuJour(tx, utilisateurId, maintenant)) >= r.favorisPlafond) return null;
    const [derniere] = await tx
      .select({ finLe: offreFavori.finLe })
      .from(offreFavori)
      .where(
        and(
          eq(offreFavori.utilisateurId, utilisateurId),
          gte(offreFavori.finLe, new Date(maintenant.getTime() - r.favorisPause * 1000)),
        ),
      )
      .limit(1);
    if (derniere) return null;
    const dormants = await republicationsEnCours(tx, utilisateurId);
    const attente = await tx
      .select({
        id: offreFavori.id,
        personne: offreFavori.personne,
        lien: offreFavori.lien,
        articleId: offreFavori.articleId,
        reference: article.reference,
        titre: article.titreAnnonce,
        statut: article.statut,
        supprimeLe: article.supprimeLe,
        prixAffiche: article.prixAffiche,
        prixVenteMinimum: article.prixVenteMinimum,
        baisseRegle: article.baisseRegle,
        baisseValeur: article.baisseValeur,
      })
      .from(offreFavori)
      .innerJoin(article, eq(article.id, offreFavori.articleId))
      .where(and(eq(offreFavori.utilisateurId, utilisateurId), eq(offreFavori.etat, "en_attente")))
      .orderBy(asc(offreFavori.favoriLe), asc(article.reference));
    const publications = await datesPublication(tx, [...new Set(attente.map((o) => o.articleId))]);
    for (const o of attente) {
      const prix =
        o.supprimeLe === null && (STATUTS_OFFRE as readonly string[]).includes(o.statut) ? prixOffre(o, r) : null;
      if (prix === null || o.prixAffiche === null || !o.titre) {
        await tx
          .update(offreFavori)
          .set({
            etat: "annulee",
            finLe: maintenant,
            message: "Offre annulée : article vendu ou retiré, ou plus de prix d'offre possible.",
          })
          .where(eq(offreFavori.id, o.id));
        continue;
      }
      // Republication du dormant prioritaire ; offre seulement N jours après la publication de l'article (#295).
      if (dormants.has(o.articleId)) continue;
      if (!publieDepuisDelai(publications, o.articleId, r.favorisDelaiJours, maintenant)) continue;
      const prise = await tx
        .update(offreFavori)
        .set({
          etat: "en_cours",
          debutLe: maintenant,
          essai: r.favorisEssai,
          prixAvant: o.prixAffiche,
          prixOffre: prix,
        })
        .where(and(eq(offreFavori.id, o.id), eq(offreFavori.etat, "en_attente")))
        .returning({ id: offreFavori.id });
      if (prise.length === 0) return null;
      return {
        id: o.id,
        essai: r.favorisEssai,
        reference: o.reference,
        titre: o.titre,
        /** Empreinte de la personne : l'extension retrouve sa notification en calculant celle de chaque pseudo. */
        personne: o.personne,
        /** Lien de la conversation gardé à la lecture (#326), ouvert directement ; null : recherche dans les notifications. */
        lien: o.lien,
        /** Euros, tels que saisis sur Vinted (ex. « 9,50 »). */
        prix: centimesVersSaisie(prix),
        prixAvant: centimesVersSaisie(o.prixAffiche),
      };
    }
    return null;
  });
}

export type ResultatOffre =
  | { resultat: "essai" }
  | { resultat: "faite" }
  /** Une offre au même prix ou moins cher est déjà dans la conversation (#295) : rien n'est envoyé. */
  | { resultat: "inutile"; message: string }
  | { resultat: "erreur"; message: string; releve: boolean };

/** Résultat d'une offre renvoyé par l'extension ; un résultat envoyé deux fois est refusé. */
export async function enregistrerResultatOffre(
  base: Base,
  utilisateurId: string,
  id: string,
  r: ResultatOffre,
  maintenant: Date,
) {
  const [x] = await base
    .update(offreFavori)
    .set({
      etat: r.resultat === "inutile" ? "annulee" : r.resultat,
      finLe: maintenant,
      message:
        r.resultat === "erreur" || r.resultat === "inutile"
          ? r.message
          : r.resultat === "essai"
            ? "Essai : offre remplie sur Vinted, rien n'a été envoyé."
            : null,
      releve: r.resultat === "erreur" && r.releve,
    })
    .where(and(eq(offreFavori.id, id), eq(offreFavori.utilisateurId, utilisateurId), eq(offreFavori.etat, "en_cours")))
    .returning({ essai: offreFavori.essai });
  if (!x) {
    const [existe] = await base
      .select({ id: offreFavori.id })
      .from(offreFavori)
      .where(and(eq(offreFavori.id, id), eq(offreFavori.utilisateurId, utilisateurId)));
    throw existe ? conflit("Cette offre n'est pas en cours.") : introuvable("Offre");
  }
  if (r.resultat === "faite" && x.essai) throw conflit("Offre en mode essai : rien ne devait être envoyé sur Vinted.");
}

/** Offres à valider (mode manuel), au format des actions des tâches. */
export async function offresAValider(base: Base | Transaction, utilisateurId: string) {
  const lignes = await base
    .select({
      id: offreFavori.id,
      articleId: offreFavori.articleId,
      reference: article.reference,
      nom: article.nom,
      etat: offreFavori.etat,
      prixAvant: offreFavori.prixAvant,
      prixApres: offreFavori.prixOffre,
      essai: offreFavori.essai,
      message: offreFavori.message,
      creeLe: offreFavori.creeLe,
      finLe: offreFavori.finLe,
    })
    .from(offreFavori)
    .innerJoin(article, eq(article.id, offreFavori.articleId))
    .where(and(eq(offreFavori.utilisateurId, utilisateurId), eq(offreFavori.etat, "a_valider")))
    .orderBy(asc(offreFavori.favoriLe));
  return lignes.map((l) => ({ ...l, type: "offre" as const, url: null }));
}

/** « Appliquer » (→ en attente de l'extension) ou « Refuser » des offres à valider ; renvoie le nombre traité. */
export async function validerOffres(
  base: Base,
  utilisateurId: string,
  ids: string[],
  appliquer: boolean,
  maintenant: Date,
): Promise<number> {
  if (ids.length === 0) throw erreurSaisie("Cochez au moins une offre.");
  const r = await base
    .update(offreFavori)
    .set(appliquer ? { etat: "en_attente" } : { etat: "refusee", finLe: maintenant })
    .where(
      and(
        eq(offreFavori.utilisateurId, utilisateurId),
        inArray(offreFavori.id, ids),
        eq(offreFavori.etat, "a_valider"),
      ),
    )
    .returning({ id: offreFavori.id });
  return r.length;
}
