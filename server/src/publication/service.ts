// Publication automatique sur Vinted (décisions des 06 et 07/10/2026, docs/decisions/publication-vinted.md).
// Le serveur tient la file d'attente ; l'extension Chrome (outils/extension-vinted) vient chercher la demande
// suivante avec un jeton personnel, publie, puis renvoie le résultat. Le serveur ne contacte jamais Vinted.
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, marque, publicationVinted, reglages, utilisateur } from "../base/schema.js";
import { changerStatut } from "../articles/service.js";
import { CATEGORIES } from "../catalogue/categories.js";
import { libelleCouleur } from "../catalogue/couleurs.js";
import { ETATS } from "../catalogue/etats.js";
import { lireReglages, modifierReglages } from "../frais/service.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";
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

async function chargerArticles(base: Base, utilisateurId: string, ids: string[]) {
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

/** Ce qui manque à un article pour être publié (liste vide = publiable). */
export function manques(a: ArticleComplet, nombrePhotosAnnonce: number): string[] {
  const m: string[] = [];
  if (a.statut !== "a_publier") m.push("statut « À publier »");
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
    await base.insert(publicationVinted).values({ utilisateurId, articleId: a.id, essai, demandeLe: maintenant });
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
 * Demande suivante pour le programme du PC (la plus ancienne en attente), passée « en cours ».
 * Une demande restée « en cours » trop longtemps passe en erreur : on ne la relance jamais seule, pour ne pas
 * risquer une annonce en double (l'utilisateur vérifie sur Vinted, puis la redemande si besoin).
 */
export async function demandeSuivante(base: Base, utilisateurId: string, maintenant: Date) {
  await base.update(reglages).set({ programmeVuLe: maintenant }).where(eq(reglages.utilisateurId, utilisateurId));
  await base
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
    );
  const [enCours] = await base
    .select({ id: publicationVinted.id })
    .from(publicationVinted)
    .where(and(eq(publicationVinted.utilisateurId, utilisateurId), eq(publicationVinted.etat, "en_cours")));
  if (enCours) return null; // une seule publication à la fois
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
      .set({ etat: "erreur", finLe: maintenant, message: "Article modifié depuis la demande : il n'est plus complet." })
      .where(eq(publicationVinted.id, suivante.id));
    return demandeSuivante(base, utilisateurId, maintenant);
  }
  await base
    .update(publicationVinted)
    .set({ etat: "en_cours", debutLe: maintenant })
    .where(eq(publicationVinted.id, suivante.id));
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

export type ResultatProgramme =
  { resultat: "publie"; url: string } | { resultat: "essai" } | { resultat: "erreur"; message: string };

/** Résultat renvoyé par le programme. Publié → l'article passe En ligne et garde le lien de l'annonce. */
export async function enregistrerResultat(
  base: Base,
  utilisateurId: string,
  id: string,
  r: ResultatProgramme,
  maintenant: Date,
) {
  const [p] = await base
    .select()
    .from(publicationVinted)
    .where(and(eq(publicationVinted.id, id), eq(publicationVinted.utilisateurId, utilisateurId)));
  if (!p) throw introuvable("Publication");
  if (p.etat !== "en_cours") throw conflit("Cette publication n'est pas en cours.");
  if (r.resultat === "publie") {
    await changerStatut(
      base,
      utilisateurId,
      p.articleId,
      { vers: "en_ligne", date: maintenant, prixAffiche: null },
      maintenant,
    );
    await base.update(article).set({ urlVinted: r.url }).where(eq(article.id, p.articleId));
  }
  await base
    .update(publicationVinted)
    .set({
      etat: r.resultat,
      finLe: maintenant,
      message:
        r.resultat === "erreur" ? r.message : r.resultat === "essai" ? "Essai : formulaire rempli, rien publié." : null,
    })
    .where(eq(publicationVinted.id, id));
}
