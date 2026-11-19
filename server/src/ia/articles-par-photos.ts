// Articles créés à partir de photos (#276, ADR-0117) : l'IA propose des groupes de photos (un groupe = un article),
// l'utilisateur les valide, un brouillon est créé par groupe, puis l'IA remplit chaque brouillon (en arrière-plan,
// dans la limite d'appels par heure : au-delà, l'article reste « en attente d'analyse » et passe plus tard).
import { readFile } from "node:fs/promises";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import sharp from "sharp";
import type { Base } from "../base/connexion.js";
import { article, historiquePrix, historiqueStatut, lieu, lotAchat, photo } from "../base/schema.js";
import { prochaineReference } from "../articles/service.js";
import { prixPropose } from "../calculs/prix-propose.js";
import { COULEURS, COULEURS_MAX } from "../catalogue/couleurs.js";
import { ETATS } from "../catalogue/etats.js";
import { ajouterValeur } from "../referentiels/service.js";
import { lierPhoto, photosDesArticles } from "../photos/service.js";
import type { StockagePhotos } from "../photos/stockage.js";
import { chargerSortie } from "../sorties/service.js";
import { erreurSaisie } from "../utilitaires/erreurs.js";
import { type ClientIA, type ImageIA, lireJson } from "./gemini.js";
import { finaliserAnnonce, trouverCategorie } from "./service.js";

/** Photos d'un lot au plus (choix de Claude, ADR-0117) : environ 15 à 20 articles. */
export const PHOTOS_MAX_LOT = 60;
/** Photos par article conseillées (au-delà : avertissement, pas de refus ; choix de l'utilisateur). */
export const PHOTOS_CONSEILLEES_ARTICLE = 10;
/** Essais de remplissage en échec avant abandon (l'article reste à compléter à la main). */
export const ESSAIS_MAX = 3;

/** Côté (px) des photos envoyées pour le regroupement : assez grand pour un objet sombre sur un fond sombre (#280). */
const COTE_REGROUPEMENT = 768;
const COTE_ANALYSE = 1024;

const PROMPT_REGROUPEMENT = `Voici {nombre} photos, chacune précédée de son numéro (« Photo 0 » à « Photo {dernier} »), dans
l'ordre où elles ont été prises. Elles montrent des articles d'occasion à vendre (vêtements, chaussures, sacs, objets) ;
chaque article a en général plusieurs photos : vue d'ensemble, autres angles (face, côté, dos, dessus, dessous),
gros plans (détail, défaut, semelle, étiquette, mesure avec un mètre ruban).
Regroupe les photos par article. Deux photos vont ensemble si elles montrent le même objet, même sous un autre angle,
de plus près, ou partiellement. Une paire (chaussures, bottes, gants, boucles d'oreilles) est UN SEUL article.
Les photos d'un même article sont presque toujours prises à la suite, sur le même fond : un changement net d'objet
(type, couleur, forme) marque le début d'un nouvel article. Un gros plan, une étiquette ou une mesure va avec l'objet
de la photo précédente. En cas de doute, regroupe avec la photo précédente plutôt que de créer un nouvel article.
Garde l'ordre des photos dans chaque groupe. Chaque numéro doit apparaître dans un seul groupe.
Réponds uniquement en JSON : {"groupes": [[0, 1, 2], [3, 4], [5]]}`;

/** Regroupement : classement, pas rédaction → réponses régulières plutôt que variées (#280). */
const TEMPERATURE_REGROUPEMENT = 0.1;

const PROMPT_ANALYSE = `Tu prépares la fiche d'un article d'occasion à vendre sur Vinted, en français, à partir des photos
jointes (vue d'ensemble, détails, et parfois l'étiquette : lis-la pour la marque, la taille et la matière).
Propose :
- nom : court (ex. « Jean Levi's 501 ») ;
- categorie : quelques mots (ex. « jean slim homme », « robe femme », « pull enfant ») ;
- marque : telle qu'écrite, sinon null ;
- etat : un parmi {etats} ;
- couleurs : 1 ou 2 parmi {couleurs} ;
- taille : telle qu'écrite (M, 38, W32 L32…), sinon null ;
- matiere : telle qu'écrite sur l'étiquette, sinon null ;
- titre : annonce de 60 caractères au plus (ex. « Jean Levi's 501 noir W32 L32 ») ;
- description : 3 à 6 lignes, ton simple et sympa, marque, taille, état et défauts visibles, quelques hashtags à la fin ;
- prix : prix de vente conseillé sur Vinted, en euros (nombre), pour un article d'occasion de ce type.
N'invente rien qui ne soit pas visible : mets null si tu ne sais pas. N'ajoute pas de référence d'article.
Réponds uniquement en JSON : {"nom": "...", "categorie": "...", "marque": "...", "etat": "...", "couleurs": ["..."],
"taille": "...", "matiere": "...", "titre": "...", "description": "...", "prix": 12}`;

const texte = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

async function imagePourIA(stockage: StockagePhotos, utilisateurId: string, fichier: string, cote: number) {
  const contenu = await readFile(stockage.chemin(utilisateurId, fichier));
  const reduite = await sharp(contenu)
    .rotate()
    .resize(cote, cote, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  return { type: "image/jpeg", base64: reduite.toString("base64") } satisfies ImageIA;
}

/** Fichiers des photos de l'utilisateur, dans l'ordre demandé ; erreur si l'une est inconnue. */
async function fichiersDesPhotos(base: Base, utilisateurId: string, photoIds: readonly string[]) {
  const lignes =
    photoIds.length === 0
      ? []
      : await base
          .select({ id: photo.id, fichier: photo.fichier })
          .from(photo)
          .where(and(eq(photo.utilisateurId, utilisateurId), inArray(photo.id, [...photoIds])));
  const parId = new Map(lignes.map((l) => [l.id, l.fichier]));
  return photoIds.map((id) => {
    const fichier = parId.get(id);
    if (!fichier) throw erreurSaisie("Photo inconnue : elle n'a pas encore été reçue.");
    return fichier;
  });
}

/**
 * Groupes valides à partir de la réponse de l'IA : chaque photo dans un seul groupe, ordre gardé ; une photo oubliée
 * par l'IA devient un article à elle seule (l'utilisateur corrige ensuite). Fonction pure.
 */
export function groupesValides(reponse: unknown, nombre: number): number[][] {
  const vus = new Set<number>();
  const groupes: number[][] = [];
  const brut = typeof reponse === "object" && reponse !== null ? (reponse as { groupes?: unknown }).groupes : null;
  for (const g of Array.isArray(brut) ? brut : []) {
    if (!Array.isArray(g)) continue;
    const groupe: number[] = [];
    for (const i of g) {
      if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= nombre || vus.has(i)) continue;
      vus.add(i);
      groupe.push(i);
    }
    if (groupe.length > 0) groupes.push(groupe);
  }
  for (let i = 0; i < nombre; i++) if (!vus.has(i)) groupes.push([i]);
  return groupes;
}

/** Groupes de photos proposés par l'IA (un groupe = un article) : identifiants des photos, dans l'ordre. */
export async function regrouperPhotos(
  base: Base,
  stockage: StockagePhotos,
  ia: ClientIA,
  utilisateurId: string,
  photoIds: readonly string[],
): Promise<string[][]> {
  if (photoIds.length === 0 || photoIds.length > PHOTOS_MAX_LOT)
    throw erreurSaisie(`Choisissez de 1 à ${PHOTOS_MAX_LOT} photos.`);
  if (new Set(photoIds).size !== photoIds.length) throw erreurSaisie("Photo en double.");
  const fichiers = await fichiersDesPhotos(base, utilisateurId, photoIds);
  if (photoIds.length === 1) return [[...photoIds]];
  const images = await Promise.all(
    fichiers.map(async (f, i) => ({
      ...(await imagePourIA(stockage, utilisateurId, f, COTE_REGROUPEMENT)),
      legende: `Photo ${i}`,
    })),
  );
  const prompt = PROMPT_REGROUPEMENT.replace("{nombre}", String(photoIds.length)).replace(
    "{dernier}",
    String(photoIds.length - 1),
  );
  const reponse = await ia.generer(prompt, images, { temperature: TEMPERATURE_REGROUPEMENT });
  const groupes = groupesValides(lireJson(reponse), photoIds.length);
  return groupes.map((g) => g.map((i) => photoIds[i] ?? ""));
}

export interface DemandeArticlesParPhotos {
  /** Un groupe de photos par article, dans l'ordre choisi (la première photo devient la principale). */
  groupes: string[][];
  /** Sortie du lot (lieu et date de la sortie) ; sinon lieu et date donnés. */
  sortieId: string | null;
  lieuId: string | null;
  date: string;
  /** Centimes : prix d'un article seul, ou prix total réparti (lot) ; null = à compléter article par article. */
  prixTotal: number | null;
}

/** Crée un brouillon par groupe, photos rattachées, « en attente d'analyse » ; renvoie les identifiants. */
export async function creerArticlesParPhotos(
  base: Base,
  utilisateurId: string,
  d: DemandeArticlesParPhotos,
  maintenant: Date,
): Promise<string[]> {
  const toutes = d.groupes.flat();
  if (d.groupes.length === 0 || d.groupes.some((g) => g.length === 0)) throw erreurSaisie("Groupe de photos vide.");
  if (toutes.length > PHOTOS_MAX_LOT) throw erreurSaisie(`${PHOTOS_MAX_LOT} photos au plus par lot.`);
  if (new Set(toutes).size !== toutes.length) throw erreurSaisie("Une photo est dans deux articles.");
  return base.transaction(async (tx) => {
    await fichiersDesPhotos(tx, utilisateurId, toutes);
    let lieuId: string;
    let dateAchat = d.date;
    if (d.sortieId !== null) {
      const s = await chargerSortie(tx, utilisateurId, d.sortieId);
      lieuId = s.lieuId;
      dateAchat = s.date;
    } else {
      const [l] = d.lieuId
        ? await tx
            .select({ id: lieu.id })
            .from(lieu)
            .where(and(eq(lieu.id, d.lieuId), eq(lieu.utilisateurId, utilisateurId)))
        : [];
      if (!l) throw erreurSaisie("Lieu d'achat : obligatoire sans sortie.");
      lieuId = l.id;
    }
    // Prix total sur plusieurs articles : un lot, réparti par le module de calcul (§6.1), jamais stocké par article.
    const enLot = d.prixTotal !== null && d.groupes.length > 1;
    const lotId = enLot ? crypto.randomUUID() : null;
    if (lotId !== null && d.prixTotal !== null)
      await tx
        .insert(lotAchat)
        .values({ id: lotId, utilisateurId, sortieId: d.sortieId, prixTotal: d.prixTotal, creeLe: maintenant });
    const ids: string[] = [];
    for (const groupe of d.groupes) {
      const reference = await prochaineReference(tx, utilisateurId);
      const [cree] = await tx
        .insert(article)
        .values({
          utilisateurId,
          reference,
          lieuId,
          sortieId: d.sortieId,
          lotId,
          prixAchat: enLot ? null : d.prixTotal,
          dateAchat,
          statut: "brouillon",
          analyseIa: "en_attente",
          creeLe: maintenant,
          modifieLe: maintenant,
        })
        .returning({ id: article.id });
      if (!cree) throw new Error("Création de l'article impossible.");
      await tx
        .insert(historiqueStatut)
        .values({ utilisateurId, articleId: cree.id, de: null, vers: "brouillon", date: maintenant });
      for (const photoId of groupe) await lierPhoto(tx, cree.id, photoId, "annonce");
      ids.push(cree.id);
    }
    return ids;
  });
}

/** Couleurs reconnues (codes, 2 au plus) dans la réponse de l'IA. */
function couleursDe(v: unknown): string[] {
  const noms = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,/]| et /) : [];
  const codes = noms
    .map((n) => (typeof n === "string" ? sansAccents(n) : ""))
    .map((n) => COULEURS.find((c) => sansAccents(c.libelle) === n || c.code === n)?.code)
    .filter((c): c is (typeof COULEURS)[number]["code"] => c !== undefined);
  return [...new Set(codes)].slice(0, COULEURS_MAX);
}

/**
 * Remplit un brouillon créé par photos avec la réponse de l'IA : seulement les champs encore vides (une saisie faite
 * entre-temps est gardée). Prix affiché proposé (#276) noté dans l'historique des prix.
 */
export async function analyserArticle(
  base: Base,
  stockage: StockagePhotos,
  ia: ClientIA,
  utilisateurId: string,
  articleId: string,
  maintenant: Date,
): Promise<void> {
  const [a] = await base
    .select()
    .from(article)
    .where(and(eq(article.id, articleId), eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe)));
  if (!a) return;
  const photos = ((await photosDesArticles(base, [articleId])).get(articleId) ?? []).slice(
    0,
    PHOTOS_CONSEILLEES_ARTICLE,
  );
  const fichiers = await fichiersDesPhotos(
    base,
    utilisateurId,
    photos.map((p) => p.id),
  );
  const images = await Promise.all(fichiers.map((f) => imagePourIA(stockage, utilisateurId, f, COTE_ANALYSE)));
  const prompt = PROMPT_ANALYSE.replace("{etats}", ETATS.map((e) => `« ${e.libelle} »`).join(", ")).replace(
    "{couleurs}",
    COULEURS.map((c) => c.libelle).join(", "),
  );
  const r = lireJson(await ia.generer(prompt, images));

  const nomMarque = texte(r.marque);
  const marqueId =
    a.marqueId ?? (nomMarque ? ((await ajouterValeur(base, utilisateurId, "marques", nomMarque))?.id ?? null) : null);
  const etatLu = texte(r.etat);
  const etat =
    a.etat ?? ETATS.find((e) => etatLu !== null && sansAccents(e.libelle) === sansAccents(etatLu))?.code ?? null;
  const titre = texte(r.titre);
  const description = texte(r.description);
  const annonce =
    titre && description && !a.titreAnnonce && !a.descriptionAnnonce
      ? finaliserAnnonce(titre, description, a.reference)
      : null;
  const prix = a.prixAffiche ?? prixPropose(r.prix);
  await base
    .update(article)
    .set({
      nom: a.nom ?? texte(r.nom),
      categorie: a.categorie ?? trouverCategorie(texte(r.categorie)),
      marqueId,
      etat,
      couleurs: a.couleurs.length > 0 ? a.couleurs : couleursDe(r.couleurs),
      taille: a.taille ?? texte(r.taille),
      matiere: a.matiere ?? texte(r.matiere),
      titreAnnonce: annonce?.titre ?? a.titreAnnonce,
      descriptionAnnonce: annonce?.description ?? a.descriptionAnnonce,
      prixAffiche: prix,
      analyseIa: "faite",
      modifieLe: maintenant,
    })
    .where(eq(article.id, articleId));
  if (a.prixAffiche === null && prix !== null)
    await base.insert(historiquePrix).values({ utilisateurId, articleId, prix, date: maintenant });
}

/**
 * Analyse des brouillons « en attente » (après la création, puis toutes les 10 minutes) : un appel par article, tant
 * que la limite par heure le permet (`reserver` compte l'appel ; faux = limite atteinte, l'article attend). Une erreur
 * de l'IA compte un essai ; au 3e, l'article passe « échec » et se complète à la main. Renvoie le nombre d'analyses.
 */
export async function analyserEnAttente(
  base: Base,
  stockage: StockagePhotos,
  ia: ClientIA,
  reserver: (utilisateurId: string) => boolean,
  maintenant: () => Date,
  journaliser: (message: string) => void = () => undefined,
): Promise<number> {
  const attente = await base
    .select({ id: article.id, utilisateurId: article.utilisateurId, essais: article.analyseEssais })
    .from(article)
    .where(and(eq(article.analyseIa, "en_attente"), isNull(article.supprimeLe)))
    .orderBy(asc(article.creeLe), asc(article.reference));
  const limites = new Set<string>();
  let faites = 0;
  for (const x of attente) {
    if (limites.has(x.utilisateurId)) continue;
    if (!reserver(x.utilisateurId)) {
      limites.add(x.utilisateurId);
      continue;
    }
    try {
      await analyserArticle(base, stockage, ia, x.utilisateurId, x.id, maintenant());
      faites += 1;
    } catch (erreur) {
      const essais = x.essais + 1;
      journaliser(`Analyse d'un article par l'IA impossible (${essais}/${ESSAIS_MAX}) : ${String(erreur)}`);
      await base
        .update(article)
        .set({ analyseEssais: essais, ...(essais >= ESSAIS_MAX ? { analyseIa: "echec" as const } : {}) })
        .where(eq(article.id, x.id));
    }
  }
  return faites;
}
