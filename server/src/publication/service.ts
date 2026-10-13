// Publication automatique sur Vinted (décisions des 06 et 07/10/2026, docs/decisions/publication-vinted.md).
// Le serveur tient la file d'attente ; l'extension Chrome (outils/extension-vinted) vient chercher la demande
// suivante avec un jeton personnel, publie, puis renvoie le résultat. Le serveur ne contacte jamais Vinted.
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, historiqueStatut, marque, publicationVinted, reglages, utilisateur } from "../base/schema.js";
import { changerStatut } from "../articles/service.js";
import { CATEGORIES } from "../catalogue/categories.js";
import { libelleCouleur } from "../catalogue/couleurs.js";
import { ETATS } from "../catalogue/etats.js";
import { lireReglages, modifierReglages } from "../frais/service.js";
import { conflit, conflitStatutChange, erreurSaisie, introuvable } from "../outils/erreurs.js";
import { photosDesArticles } from "../photos/service.js";

/** Une demande « en cours » depuis plus longtemps est considérée comme interrompue (jamais relancée seule). */
const DELAI_INTERRUPTION_MS = 15 * 60 * 1000;

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

/** Crée (ou remplace) le jeton du programme ; il n'est affiché qu'une fois, seule son empreinte est gardée. */
export async function creerJeton(base: Base, utilisateurId: string): Promise<string> {
  const jeton = `vh_${randomBytes(24).toString("base64url")}`;
  await modifierReglages(base, utilisateurId, {});
  await base
    .update(reglages)
    .set({ jetonPublication: empreinte(jeton) })
    .where(eq(reglages.utilisateurId, utilisateurId));
  return jeton;
}

/** Utilisateur correspondant à un jeton de programme, ou null. */
export async function utilisateurParJeton(base: Base, jeton: string) {
  const [ligne] = await base
    .select({ id: utilisateur.id, identifiant: utilisateur.identifiant })
    .from(reglages)
    .innerJoin(utilisateur, eq(utilisateur.id, reglages.utilisateurId))
    .where(eq(reglages.jetonPublication, empreinte(jeton)));
  return ligne ?? null;
}

type ArticleComplet = Awaited<ReturnType<typeof chargerArticles>>[number];

async function chargerArticles(base: Base | Transaction, utilisateurId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return base
    .select({
      id: article.id,
      reference: article.reference,
      nom: article.nom,
      statut: article.statut,
      categorie: article.categorie,
      marque: marque.nom,
      etat: article.etat,
      taille: article.taille,
      couleurs: article.couleurs,
      formatColis: article.formatColis,
      prixAffiche: article.prixAffiche,
      titre: article.titreAnnonce,
      description: article.descriptionAnnonce,
    })
    .from(article)
    .leftJoin(marque, eq(marque.id, article.marqueId))
    .where(and(eq(article.utilisateurId, utilisateurId), inArray(article.id, ids), isNull(article.supprimeLe)));
}

/** Ce qui manque à un article pour être publié (liste vide = publiable). Depuis Erreur, on peut redemander (#72). */
export function manques(a: ArticleComplet, nombrePhotosAnnonce: number): string[] {
  const m: string[] = [];
  if (a.statut !== "a_publier" && a.statut !== "erreur_publication") m.push("statut « À publier »");
  if (nombrePhotosAnnonce === 0) m.push("photos d'annonce");
  if (!a.prixAffiche) m.push("prix affiché");
  if (!a.titre?.trim()) m.push("titre de l'annonce");
  if (!a.description?.trim()) m.push("description de l'annonce");
  if (!a.categorie) m.push("catégorie");
  if (!a.marque) m.push("marque");
  if (!a.etat) m.push("état");
  if (a.couleurs.length === 0) m.push("couleur");
  return m;
}

/** Ajoute des articles à la file de publication ; les articles incomplets sont refusés avec leurs manques. */
export async function demanderPublication(
  base: Base,
  utilisateurId: string,
  articleIds: string[],
  essai: boolean,
  maintenant: Date,
) {
  if (articleIds.length === 0) throw erreurSaisie("Choisissez au moins un article.");
  const articles = await chargerArticles(base, utilisateurId, articleIds);
  const photos = await photosDesArticles(
    base,
    articles.map((a) => a.id),
  );
  const actives = await base
    .select({ articleId: publicationVinted.articleId })
    .from(publicationVinted)
    .where(
      and(
        eq(publicationVinted.utilisateurId, utilisateurId),
        inArray(publicationVinted.etat, ["en_attente", "en_cours"]),
      ),
    );
  const dejaEnFile = new Set(actives.map((p) => p.articleId));
  const acceptes: number[] = [];
  const refuses: { reference: number; nom: string | null; manques: string[] }[] = [];
  for (const a of articles.sort((x, y) => x.reference - y.reference)) {
    const m = manques(a, (photos.get(a.id) ?? []).filter((p) => p.type === "annonce").length);
    if (dejaEnFile.has(a.id)) m.push("déjà dans la file de publication");
    if (m.length > 0) {
      refuses.push({ reference: a.reference, nom: a.nom, manques: m });
      continue;
    }
    // Nouvelle vraie demande depuis Erreur (#72) : l'article repasse À publier, dans la même transaction que la
    // demande (#92). Un essai ne change jamais le statut : l'article reste en Erreur.
    await base.transaction(async (tx) => {
      if (a.statut === "erreur_publication" && !essai) {
        const modifies = await tx
          .update(article)
          .set({ statut: "a_publier", modifieLe: maintenant })
          .where(and(eq(article.id, a.id), eq(article.statut, "erreur_publication")))
          .returning({ id: article.id });
        if (modifies.length === 0) throw conflitStatutChange();
        await tx
          .insert(historiqueStatut)
          .values({ utilisateurId, articleId: a.id, de: "erreur_publication", vers: "a_publier", date: maintenant });
      }
      await tx.insert(publicationVinted).values({ utilisateurId, articleId: a.id, essai, demandeLe: maintenant });
    });
    acceptes.push(a.reference);
  }
  return { acceptes, refuses };
}

export async function listerPublications(base: Base, utilisateurId: string) {
  const [publications, r] = await Promise.all([
    base
      .select({
        id: publicationVinted.id,
        articleId: publicationVinted.articleId,
        reference: article.reference,
        nom: article.nom,
        etat: publicationVinted.etat,
        essai: publicationVinted.essai,
        message: publicationVinted.message,
        demandeLe: publicationVinted.demandeLe,
        finLe: publicationVinted.finLe,
        urlVinted: article.urlVinted,
      })
      .from(publicationVinted)
      .innerJoin(article, eq(article.id, publicationVinted.articleId))
      .where(eq(publicationVinted.utilisateurId, utilisateurId))
      .orderBy(desc(publicationVinted.demandeLe))
      .limit(100),
    base
      .select({ programmeVuLe: reglages.programmeVuLe, jeton: reglages.jetonPublication })
      .from(reglages)
      .where(eq(reglages.utilisateurId, utilisateurId)),
  ]);
  return { publications, programmeVuLe: r[0]?.programmeVuLe ?? null, jetonCree: !!r[0]?.jeton };
}

export async function annulerPublication(base: Base, utilisateurId: string, id: string, maintenant: Date) {
  const r = await base
    .update(publicationVinted)
    .set({ etat: "annule", finLe: maintenant })
    .where(
      and(
        eq(publicationVinted.id, id),
        eq(publicationVinted.utilisateurId, utilisateurId),
        eq(publicationVinted.etat, "en_attente"),
      ),
    )
    .returning({ id: publicationVinted.id });
  if (r.length === 0) throw conflit("Seule une demande en attente peut être annulée.");
}

/** Nombre de demandes en attente (le programme n'ouvre Vinted que s'il y a du travail). */
export async function nombreEnAttente(base: Base, utilisateurId: string, maintenant: Date) {
  await base.update(reglages).set({ programmeVuLe: maintenant }).where(eq(reglages.utilisateurId, utilisateurId));
  const lignes = await base
    .select({ id: publicationVinted.id })
    .from(publicationVinted)
    .where(and(eq(publicationVinted.utilisateurId, utilisateurId), eq(publicationVinted.etat, "en_attente")));
  return lignes.length;
}

/**
 * Échec d'une vraie publication (pas d'un essai) : l'article À publier passe en Erreur (issue #72). Ce passage
 * n'est jamais proposé à l'utilisateur (absent du tableau du §4.2) : seule la publication le fait.
 */
async function passerEnErreur(base: Base | Transaction, utilisateurId: string, articleId: string, maintenant: Date) {
  const r = await base
    .update(article)
    .set({ statut: "erreur_publication", modifieLe: maintenant })
    .where(and(eq(article.id, articleId), eq(article.utilisateurId, utilisateurId), eq(article.statut, "a_publier")))
    .returning({ id: article.id });
  if (r.length === 0) return;
  await base
    .insert(historiqueStatut)
    .values({ utilisateurId, articleId, de: "a_publier", vers: "erreur_publication", date: maintenant });
}

/**
 * Demande suivante pour le programme du PC (la plus ancienne en attente), passée « en cours ».
 * Une demande restée « en cours » trop longtemps passe en erreur : on ne la relance jamais seule, pour ne pas
 * risquer une annonce en double (l'utilisateur vérifie sur Vinted, puis la redemande si besoin).
 */
export async function demandeSuivante(base: Base, utilisateurId: string, maintenant: Date) {
  // Un seul appel à la fois par utilisateur (issue #121) : deux appels simultanés (alarme de l'extension et
  // « Vérifier maintenant », nouvel essai réseau) ne peuvent pas prendre chacun une demande, ni la même.
  return base.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`publication:${utilisateurId}`}))`);
    return suivanteDansLaFile(tx, utilisateurId, maintenant);
  });
}

async function suivanteDansLaFile(base: Transaction, utilisateurId: string, maintenant: Date) {
  await base.update(reglages).set({ programmeVuLe: maintenant }).where(eq(reglages.utilisateurId, utilisateurId));
  const interrompues = await base
    .update(publicationVinted)
    .set({
      etat: "erreur",
      finLe: maintenant,
      message: "Interrompue : vérifiez sur Vinted si l'annonce a été créée avant de la redemander.",
    })
    .where(
      and(
        eq(publicationVinted.utilisateurId, utilisateurId),
        eq(publicationVinted.etat, "en_cours"),
        lt(publicationVinted.debutLe, new Date(maintenant.getTime() - DELAI_INTERRUPTION_MS)),
      ),
    )
    .returning({ articleId: publicationVinted.articleId, essai: publicationVinted.essai });
  for (const p of interrompues) if (!p.essai) await passerEnErreur(base, utilisateurId, p.articleId, maintenant);
  const [enCours] = await base
    .select({ id: publicationVinted.id })
    .from(publicationVinted)
    .where(and(eq(publicationVinted.utilisateurId, utilisateurId), eq(publicationVinted.etat, "en_cours")));
  if (enCours) return null; // une seule publication à la fois
  for (;;) {
    const [suivante] = await base
      .select({ id: publicationVinted.id, articleId: publicationVinted.articleId, essai: publicationVinted.essai })
      .from(publicationVinted)
      .where(and(eq(publicationVinted.utilisateurId, utilisateurId), eq(publicationVinted.etat, "en_attente")))
      .orderBy(asc(publicationVinted.demandeLe))
      .limit(1);
    if (!suivante) return null;
    const [a] = await chargerArticles(base, utilisateurId, [suivante.articleId]);
    const photos = ((await photosDesArticles(base, [suivante.articleId])).get(suivante.articleId) ?? []).filter(
      (p) => p.type === "annonce",
    );
    if (!a || manques(a, photos.length).length > 0) {
      await base
        .update(publicationVinted)
        .set({
          etat: "erreur",
          finLe: maintenant,
          message: "Article modifié depuis la demande : il n'est plus complet.",
        })
        .where(eq(publicationVinted.id, suivante.id));
      if (!suivante.essai) await passerEnErreur(base, utilisateurId, suivante.articleId, maintenant);
      continue; // demande suivante
    }
    // Revendication conditionnelle : la demande n'est prise que si elle est encore en attente.
    const prise = await base
      .update(publicationVinted)
      .set({ etat: "en_cours", debutLe: maintenant })
      .where(and(eq(publicationVinted.id, suivante.id), eq(publicationVinted.etat, "en_attente")))
      .returning({ id: publicationVinted.id });
    if (prise.length === 0) return null;
    const { formatColisDefaut } = await lireReglages(base, utilisateurId);
    const ordonnees = [...photos.filter((p) => p.estPrincipale), ...photos.filter((p) => !p.estPrincipale)];
    return {
      id: suivante.id,
      essai: suivante.essai,
      article: {
        reference: a.reference,
        titre: a.titre ?? "",
        description: a.description ?? "",
        /** Euros, tel que saisi sur Vinted (ex. « 12,50 »). */
        prix: `${Math.floor((a.prixAffiche ?? 0) / 100)},${String((a.prixAffiche ?? 0) % 100).padStart(2, "0")}`,
        categorie: CATEGORIES.find((c) => c.code === a.categorie)?.chemin ?? [],
        marque: a.marque ?? "",
        etat: ETATS.find((e) => e.code === a.etat)?.libelle ?? "",
        taille: a.taille,
        couleurs: a.couleurs.map(libelleCouleur),
        formatColis: a.formatColis ?? formatColisDefaut,
        photos: ordonnees.map((p) => `/api/photos/${p.id}`),
      },
    };
  }
}

export type ResultatProgramme =
  { resultat: "publie"; url: string } | { resultat: "essai" } | { resultat: "erreur"; message: string };

/**
 * Résultat renvoyé par le programme. Publié → l'article passe En ligne et garde le lien de l'annonce ; erreur d'une
 * vraie publication → l'article passe en Erreur (#72) ; essai → rien ne change.
 */
export async function enregistrerResultat(
  base: Base,
  utilisateurId: string,
  id: string,
  r: ResultatProgramme,
  maintenant: Date,
) {
  // Tout ou rien (issue #121) : la publication, le statut de l'article et son lien changent ensemble. La publication
  // n'est terminée que si elle est encore en cours : un résultat envoyé deux fois est refusé.
  await base.transaction(async (tx) => {
    const [p] = await tx
      .update(publicationVinted)
      .set({
        etat: r.resultat,
        finLe: maintenant,
        message:
          r.resultat === "erreur"
            ? r.message
            : r.resultat === "essai"
              ? "Essai : formulaire rempli, rien publié."
              : null,
      })
      .where(
        and(
          eq(publicationVinted.id, id),
          eq(publicationVinted.utilisateurId, utilisateurId),
          eq(publicationVinted.etat, "en_cours"),
        ),
      )
      .returning({ articleId: publicationVinted.articleId, essai: publicationVinted.essai });
    if (!p) {
      const [existe] = await tx
        .select({ id: publicationVinted.id })
        .from(publicationVinted)
        .where(and(eq(publicationVinted.id, id), eq(publicationVinted.utilisateurId, utilisateurId)));
      throw existe ? conflit("Cette publication n'est pas en cours.") : introuvable("Publication");
    }
    if (r.resultat === "publie") {
      await changerStatut(
        tx,
        utilisateurId,
        p.articleId,
        { vers: "en_ligne", date: maintenant, prixAffiche: null },
        maintenant,
      );
      await tx.update(article).set({ urlVinted: r.url }).where(eq(article.id, p.articleId));
    }
    if (r.resultat === "erreur" && !p.essai) await passerEnErreur(tx, utilisateurId, p.articleId, maintenant);
  });
}
