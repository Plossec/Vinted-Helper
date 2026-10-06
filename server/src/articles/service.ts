// Articles : création (référence automatique), lecture, modification, statuts et historiques.
// Cahier des charges §4, §5.2, §7. Aucun calcul d'argent ici : les coûts viennent du module de calcul.
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import {
  article,
  boost,
  historiquePrix,
  historiqueStatut,
  lieu,
  lotAchat,
  marque,
  sortie,
  utilisateur,
  vente,
  venteArticle,
} from "../base/schema.js";
import type { CodeEtat } from "../catalogue/etats.js";
import { estTransitionSimple, type Statut, transitionsProposees, verifierTransition } from "../metier/statuts.js";
import { calculer } from "../couts/service.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";
import { choisirVignette, photosDesArticles } from "../photos/service.js";

/** Champs modifiables d'une fiche article (montants en centimes). */
export interface DonneesArticle {
  nom: string;
  lieuId: string;
  /** Obligatoire hors lot ; ignoré pour un article de lot (part du prix total, §6.1). */
  prixAchat: number | null;
  dateAchat: string;
  /** Code de l'arbre des catégories (obligatoire, sauf futur brouillon de la saisie terrain). */
  categorie: string;
  marqueId: string;
  etat: CodeEtat;
  gamme: string | null;
  taille: string | null;
  matiere: string | null;
  notes: string | null;
  prixAffiche: number | null;
}

/** Tolérance pour une date « dans le futur » (décalage d'horloge entre téléphone et serveur). */
const TOLERANCE_FUTUR_MS = 5 * 60 * 1000;

/** Vérifie que chaque valeur de liste choisie appartient bien à l'utilisateur. */
async function verifierReferentiels(tx: Transaction, utilisateurId: string, d: DonneesArticle) {
  const controles = [
    { id: d.lieuId, table: lieu, nom: "Lieu" },
    { id: d.marqueId, table: marque, nom: "Marque" },
  ] as const;
  for (const { id, table, nom } of controles) {
    const [trouve] = await tx
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, id), eq(table.utilisateurId, utilisateurId)));
    if (!trouve) throw erreurSaisie(`${nom} inconnu(e).`);
  }
}

/** Attribue le prochain numéro de référence (jamais réutilisé, même après suppression). */
export async function prochaineReference(tx: Transaction, utilisateurId: string): Promise<number> {
  const [ligne] = await tx
    .update(utilisateur)
    .set({ dernierNumeroReference: sql`${utilisateur.dernierNumeroReference} + 1` })
    .where(eq(utilisateur.id, utilisateurId))
    .returning({ numero: utilisateur.dernierNumeroReference });
  if (!ligne) throw introuvable("Utilisateur");
  return ligne.numero;
}

export async function creerArticle(
  base: Base,
  utilisateurId: string,
  donnees: DonneesArticle,
  maintenant: Date,
  idPropose: string | null = null,
): Promise<string> {
  if (donnees.prixAchat === null) throw erreurSaisie("Prix d'achat : obligatoire.");
  return base.transaction(async (tx) => {
    if (idPropose !== null) {
      // Renvoi d'une création déjà reçue (utile pour la file d'envoi du lot 2) : pas de doublon.
      const [existant] = await tx
        .select({ id: article.id, utilisateurId: article.utilisateurId })
        .from(article)
        .where(eq(article.id, idPropose));
      if (existant) {
        if (existant.utilisateurId !== utilisateurId) throw conflit("Identifiant d'article déjà utilisé.");
        return existant.id;
      }
    }
    await verifierReferentiels(tx, utilisateurId, donnees);
    const reference = await prochaineReference(tx, utilisateurId);
    const [cree] = await tx
      .insert(article)
      .values({
        ...(idPropose === null ? {} : { id: idPropose }),
        utilisateurId,
        reference,
        ...donnees,
        statut: "brouillon",
        creeLe: maintenant,
        modifieLe: maintenant,
      })
      .returning({ id: article.id });
    if (!cree) throw new Error("Création de l'article impossible.");
    await tx
      .insert(historiqueStatut)
      .values({ utilisateurId, articleId: cree.id, de: null, vers: "brouillon", date: maintenant });
    if (donnees.prixAffiche !== null) {
      await tx
        .insert(historiquePrix)
        .values({ utilisateurId, articleId: cree.id, prix: donnees.prixAffiche, date: maintenant });
    }
    return cree.id;
  });
}

export async function chargerArticle(tx: Transaction | Base, utilisateurId: string, id: string) {
  const [ligne] = await tx
    .select()
    .from(article)
    .where(and(eq(article.id, id), eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe)));
  if (!ligne) throw introuvable("Article");
  return ligne;
}

export async function modifierArticle(
  base: Base,
  utilisateurId: string,
  id: string,
  donnees: DonneesArticle,
  maintenant: Date,
): Promise<void> {
  await base.transaction(async (tx) => {
    const actuel = await chargerArticle(tx, utilisateurId, id);
    if (actuel.statut === "en_ligne" && donnees.prixAffiche === null) {
      throw erreurSaisie("Un article En ligne doit garder un prix affiché.");
    }
    await verifierReferentiels(tx, utilisateurId, donnees);
    // Article de lot : le prix d'achat n'est pas modifié article par article (§6.1).
    const prixAchat = actuel.lotId === null ? donnees.prixAchat : null;
    if (actuel.lotId === null && prixAchat === null) throw erreurSaisie("Prix d'achat : obligatoire.");
    await tx
      .update(article)
      .set({ ...donnees, prixAchat, modifieLe: maintenant })
      .where(eq(article.id, id));
    if (donnees.prixAffiche !== null && donnees.prixAffiche !== actuel.prixAffiche) {
      await tx
        .insert(historiquePrix)
        .values({ utilisateurId, articleId: id, prix: donnees.prixAffiche, date: maintenant });
    }
  });
}

export function verifierDate(date: Date, maintenant: Date) {
  if (date.getTime() > maintenant.getTime() + TOLERANCE_FUTUR_MS) {
    throw erreurSaisie("La date ne peut pas être dans le futur.");
  }
}

/** Change le statut (§4.2), avec une date modifiable (§4.4) et, pour En ligne, le prix affiché si besoin. */
export async function changerStatut(
  base: Base,
  utilisateurId: string,
  id: string,
  demande: { vers: Statut; date: Date | null; prixAffiche: number | null },
  maintenant: Date,
): Promise<void> {
  const date = demande.date ?? maintenant;
  verifierDate(date, maintenant);
  await base.transaction(async (tx) => {
    const actuel = await chargerArticle(tx, utilisateurId, id);
    let prixAffiche = actuel.prixAffiche;
    if (demande.prixAffiche !== null && demande.prixAffiche !== actuel.prixAffiche) {
      prixAffiche = demande.prixAffiche;
      await tx.insert(historiquePrix).values({ utilisateurId, articleId: id, prix: prixAffiche, date });
    }
    const verification = verifierTransition(actuel.statut, demande.vers, { prixAffiche });
    if (!verification.ok) throw conflit(verification.raison);
    if (!estTransitionSimple(actuel.statut, demande.vers)) {
      throw conflit(
        "Ce passage se fait par son action dédiée : « Vendu », envoi, finalisation, annulation, retour ou sortie du stock.",
      );
    }
    await tx
      .update(article)
      .set({ statut: demande.vers, prixAffiche, modifieLe: maintenant })
      .where(eq(article.id, id));
    await tx
      .insert(historiqueStatut)
      .values({ utilisateurId, articleId: id, de: actuel.statut, vers: demande.vers, date });
  });
}

/** Corrige la date d'un changement de statut déjà enregistré (§4.4). */
export async function corrigerDateHistorique(
  base: Base,
  utilisateurId: string,
  historiqueId: string,
  date: Date,
  maintenant: Date,
): Promise<void> {
  verifierDate(date, maintenant);
  await base.transaction(async (tx) => {
    const [ligne] = await tx
      .select()
      .from(historiqueStatut)
      .where(and(eq(historiqueStatut.id, historiqueId), eq(historiqueStatut.utilisateurId, utilisateurId)));
    if (!ligne) throw introuvable("Changement de statut");
    await tx.update(historiqueStatut).set({ date }).where(eq(historiqueStatut.id, historiqueId));

    // Vente, envoi, finalisation : la date vaut pour tout le colis (§4.3) et pour la vente (CA du mois, §6.6).
    const champ = { a_expedier: "dateVente", envoye: "dateEnvoi", finalise: "dateFinalisation" } as const;
    if (ligne.vers !== "a_expedier" && ligne.vers !== "envoye" && ligne.vers !== "finalise") return;
    const [active] = await tx
      .select({ id: vente.id })
      .from(venteArticle)
      .innerJoin(vente, eq(vente.id, venteArticle.venteId))
      .where(
        and(eq(venteArticle.articleId, ligne.articleId), eq(vente.annulee, false), eq(venteArticle.retourne, false)),
      );
    if (!active) return;
    await tx
      .update(vente)
      .set({ [champ[ligne.vers]]: date })
      .where(eq(vente.id, active.id));
    const membres = await tx
      .select({ id: venteArticle.articleId })
      .from(venteArticle)
      .where(eq(venteArticle.venteId, active.id));
    await tx
      .update(historiqueStatut)
      .set({ date })
      .where(
        and(
          inArray(
            historiqueStatut.articleId,
            membres.map((m) => m.id),
          ),
          eq(historiqueStatut.vers, ligne.vers),
          eq(historiqueStatut.date, ligne.date),
        ),
      );
  });
}

export async function listerArticles(base: Base, utilisateurId: string) {
  const lignes = await base
    .select({
      id: article.id,
      reference: article.reference,
      nom: article.nom,
      statut: article.statut,
      prixAffiche: article.prixAffiche,
      creeLe: article.creeLe,
    })
    .from(article)
    .where(and(eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe)))
    .orderBy(desc(article.creeLe), desc(article.reference));
  const photos = await photosDesArticles(
    base,
    lignes.map((a) => a.id),
  );
  return lignes.map((a) => ({ ...a, vignette: choisirVignette(photos.get(a.id) ?? []) }));
}

export async function lireArticle(base: Base, utilisateurId: string, id: string) {
  const a = await chargerArticle(base, utilisateurId, id);
  const historiqueStatuts = await base
    .select({
      id: historiqueStatut.id,
      de: historiqueStatut.de,
      vers: historiqueStatut.vers,
      date: historiqueStatut.date,
    })
    .from(historiqueStatut)
    .where(eq(historiqueStatut.articleId, id))
    .orderBy(asc(historiqueStatut.date), asc(historiqueStatut.ordre));
  const calculs = await calculer(base, utilisateurId);
  const photos = (await photosDesArticles(base, [id])).get(id) ?? [];
  const [s] = a.sortieId
    ? await base
        .select({ id: sortie.id, date: sortie.date, lieu: lieu.nom })
        .from(sortie)
        .innerJoin(lieu, eq(lieu.id, sortie.lieuId))
        .where(eq(sortie.id, a.sortieId))
    : [];
  const detail = calculs.details.get(id) ?? null;
  const venteActive = detail?.venteId
    ? ((
        await base
          .select({
            id: vente.id,
            montantCredite: vente.montantCredite,
            emballage: vente.emballage,
            dateVente: vente.dateVente,
            dateEnvoi: vente.dateEnvoi,
            dateFinalisation: vente.dateFinalisation,
          })
          .from(vente)
          .where(eq(vente.id, detail.venteId))
      )[0] ?? null)
    : null;
  const nombreArticlesVente = venteActive
    ? (
        await base
          .select({ id: venteArticle.articleId })
          .from(venteArticle)
          .where(and(eq(venteArticle.venteId, venteActive.id), eq(venteArticle.retourne, false)))
      ).length
    : 0;
  const boosts = await base
    .select({ id: boost.id, montant: boost.montant, date: boost.date })
    .from(boost)
    .where(eq(boost.articleId, id))
    .orderBy(asc(boost.date));
  const historiquePrixAffiche = await base
    .select({ prix: historiquePrix.prix, date: historiquePrix.date })
    .from(historiquePrix)
    .where(eq(historiquePrix.articleId, id))
    .orderBy(asc(historiquePrix.date), asc(historiquePrix.id));
  let lot = null;
  if (a.lotId) {
    const [l] = await base.select({ prixTotal: lotAchat.prixTotal }).from(lotAchat).where(eq(lotAchat.id, a.lotId));
    const membres = await base
      .select({ id: article.id, reference: article.reference })
      .from(article)
      .where(and(eq(article.lotId, a.lotId), isNull(article.supprimeLe)))
      .orderBy(asc(article.reference));
    lot = { id: a.lotId, prixTotal: l?.prixTotal ?? 0, articles: membres };
  }
  return {
    id: a.id,
    reference: a.reference,
    nom: a.nom,
    categorie: a.categorie,
    marqueId: a.marqueId,
    etat: a.etat,
    gamme: a.gamme,
    taille: a.taille,
    matiere: a.matiere,
    notes: a.notes,
    lieuId: a.lieuId,
    sortieId: a.sortieId,
    sortie: s ?? null,
    lot,
    /** Prix saisi (article hors lot) ; vide pour un article de lot. */
    prixAchat: a.prixAchat,
    /** Montants calculés (centimes) : prix d'achat (part de lot), essence, emballage, boosts, prix vendu, bénéfice. */
    couts: detail,
    vente: venteActive ? { ...venteActive, nombreArticles: nombreArticlesVente } : null,
    boosts,
    historiquePrix: historiquePrixAffiche,
    sortieStock:
      a.motifSortie === null
        ? null
        : { motif: a.motifSortie, canal: a.canalRevente, prixRevente: a.prixRevente, date: a.dateSortieStock },
    titreAnnonce: a.titreAnnonce,
    descriptionAnnonce: a.descriptionAnnonce,
    photos,
    dateAchat: a.dateAchat,
    statut: a.statut,
    prixAffiche: a.prixAffiche,
    creeLe: a.creeLe,
    modifieLe: a.modifieLe,
    transitionsPossibles: transitionsProposees(a.statut),
    historiqueStatuts,
  };
}
