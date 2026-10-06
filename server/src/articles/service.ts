// Articles : création (référence automatique), lecture, modification, statuts et historiques.
// Cahier des charges §4, §5.2, §7. Aucun calcul d'argent ici : les coûts viennent du module de calcul.
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import {
  article,
  historiquePrix,
  historiqueStatut,
  lieu,
  lotAchat,
  marque,
  sortie,
  utilisateur,
} from "../base/schema.js";
import type { CodeEtat } from "../catalogue/etats.js";
import { STATUTS_DISPONIBLES, type Statut, transitionsProposees, verifierTransition } from "../metier/statuts.js";
import { calculerCoutsAchat } from "../couts/service.js";
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

async function chargerArticle(tx: Transaction | Base, utilisateurId: string, id: string) {
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

function verifierDate(date: Date, maintenant: Date) {
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
    if (!STATUTS_DISPONIBLES.has(demande.vers)) {
      throw conflit("Ce changement de statut sera disponible dans une prochaine version (lot 3).");
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
  const resultat = await base
    .update(historiqueStatut)
    .set({ date })
    .where(and(eq(historiqueStatut.id, historiqueId), eq(historiqueStatut.utilisateurId, utilisateurId)))
    .returning({ id: historiqueStatut.id });
  if (resultat.length === 0) throw introuvable("Changement de statut");
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
    .orderBy(asc(historiqueStatut.date), asc(historiqueStatut.id));
  const couts = await calculerCoutsAchat(base, utilisateurId);
  const photos = (await photosDesArticles(base, [id])).get(id) ?? [];
  const [s] = a.sortieId
    ? await base
        .select({ id: sortie.id, date: sortie.date, lieu: lieu.nom })
        .from(sortie)
        .innerJoin(lieu, eq(lieu.id, sortie.lieuId))
        .where(eq(sortie.id, a.sortieId))
    : [];
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
    /** Coûts calculés (centimes) : prix d'achat effectif (part de lot comprise) et part d'essence. */
    couts: { prixAchat: couts.prixAchat.get(id) ?? 0, essence: couts.essence.get(id) ?? 0 },
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
