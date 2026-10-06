// IA (§5.5) : génération de l'annonce, lecture d'étiquette, prompt prêt à copier (secours).
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import type { Base } from "../base/connexion.js";
import { article, marque, photo as photoTable } from "../base/schema.js";
import { chargerArticle } from "../articles/service.js";
import { CATEGORIES } from "../catalogue/categories.js";
import { ETATS } from "../catalogue/etats.js";
import { lireReglages } from "../frais/service.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { photosDesArticles } from "../photos/service.js";
import type { StockagePhotos } from "../photos/stockage.js";
import { type ClientIA, type ImageIA, lireJson } from "./gemini.js";
import { PROMPT_ANNONCE_DEFAUT, PROMPT_ETIQUETTE_DEFAUT, remplir } from "./prompts.js";

/** 3 à 4 photos envoyées à Gemini (§5.5), réduites pour rester dans le quota gratuit. */
const PHOTOS_MAX = 4;
const COTE_IA = 1024;
export const TITRE_MAX = 60;

const texte = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Titre ≤ 60 caractères (coupé au dernier mot) ; description terminée par « Réf. 127 » (§5.5). */
export function finaliserAnnonce(titreBrut: string, descriptionBrute: string, reference: number) {
  let titre = titreBrut.replace(/\s+/g, " ").trim();
  if (titre.length > TITRE_MAX) {
    const coupe = titre.slice(0, TITRE_MAX + 1);
    const espace = coupe.lastIndexOf(" ");
    titre = (espace > 20 ? coupe.slice(0, espace) : coupe.slice(0, TITRE_MAX)).trim();
  }
  const lignes = descriptionBrute
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => !/^\s*réf\.?\s*#?\d+\s*$/i.test(l));
  while (lignes.length > 0 && lignes[lignes.length - 1]?.trim() === "") lignes.pop();
  return { titre, description: `${lignes.join("\n")}\n\nRéf. ${reference}` };
}

async function photosPourIA(base: Base, stockage: StockagePhotos, utilisateurId: string, articleId: string) {
  const photos = (await photosDesArticles(base, [articleId])).get(articleId) ?? [];
  const ordonnees = [
    ...photos.filter((p) => p.estPrincipale),
    ...photos.filter((p) => p.type === "annonce" && !p.estPrincipale),
    ...photos.filter((p) => p.type === "terrain"),
  ].slice(0, PHOTOS_MAX);
  const images: ImageIA[] = [];
  for (const p of ordonnees) {
    const [ligne] = await base.select({ fichier: photoTable.fichier }).from(photoTable).where(eq(photoTable.id, p.id));
    if (!ligne) continue;
    try {
      const contenu = await readFile(stockage.chemin(utilisateurId, ligne.fichier));
      const reduite = await sharp(contenu)
        .rotate()
        .resize(COTE_IA, COTE_IA, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      images.push({ type: "image/jpeg", base64: reduite.toString("base64") });
    } catch {
      // Photo illisible ou absente : on continue sans elle.
    }
  }
  return images;
}

/** Prompt de l'annonce rempli avec la fiche (aussi utilisé par « Copier le prompt »). */
export async function promptAnnonce(base: Base, utilisateurId: string, articleId: string) {
  const a = await chargerArticle(base, utilisateurId, articleId);
  const [m] = a.marqueId ? await base.select({ nom: marque.nom }).from(marque).where(eq(marque.id, a.marqueId)) : [];
  const categorie = CATEGORIES.find((c) => c.code === a.categorie)?.chemin.join(" › ");
  const etat = ETATS.find((e) => e.code === a.etat)?.libelle;
  const { promptAnnonce: personnalise } = await lireReglages(base, utilisateurId);
  return {
    reference: a.reference,
    prompt: remplir(personnalise ?? PROMPT_ANNONCE_DEFAUT, {
      nom: a.nom,
      categorie,
      marque: m?.nom,
      gamme: a.gamme,
      taille: a.taille,
      etat,
      matiere: a.matiere,
      notes: a.notes,
    }),
  };
}

/** « Générer l'annonce » : demande à Gemini, puis enregistre titre et description (modifiables ensuite). */
export async function genererAnnonce(
  base: Base,
  stockage: StockagePhotos,
  ia: ClientIA,
  utilisateurId: string,
  articleId: string,
  maintenant: Date,
) {
  const { prompt, reference } = await promptAnnonce(base, utilisateurId, articleId);
  const images = await photosPourIA(base, stockage, utilisateurId, articleId);
  const reponse = lireJson(await ia.generer(prompt, images));
  const titre = texte(reponse.titre);
  const description = texte(reponse.description);
  if (!titre || !description) throw erreurSaisie("Gemini n'a pas renvoyé de titre ou de description.");
  const annonce = finaliserAnnonce(titre, description, reference);
  await base
    .update(article)
    .set({ titreAnnonce: annonce.titre, descriptionAnnonce: annonce.description, modifieLe: maintenant })
    .where(eq(article.id, articleId));
  return annonce;
}

/** Titre et description saisis ou corrigés à la main. */
export async function modifierAnnonce(
  base: Base,
  utilisateurId: string,
  articleId: string,
  d: { titre: string | null; description: string | null },
  maintenant: Date,
) {
  await chargerArticle(base, utilisateurId, articleId);
  await base
    .update(article)
    .set({ titreAnnonce: d.titre, descriptionAnnonce: d.description, modifieLe: maintenant })
    .where(eq(article.id, articleId));
}

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mots = (t: string) =>
  sansAccents(t)
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length > 1)
    .map((m) => (m.length > 3 ? m.replace(/s$/, "") : m));

/** Catégorie de l'arbre la plus proche d'un texte libre (« jean slim homme ») ; null si rien ne correspond. */
export function trouverCategorie(libre: string | null): string | null {
  if (!libre) return null;
  const cherches = mots(libre);
  if (cherches.length === 0) return null;
  let meilleure: { code: string; score: number } | null = null;
  for (const c of CATEGORIES) {
    const feuille = mots(c.chemin[c.chemin.length - 1] ?? "");
    const chemin = new Set(mots(c.chemin.join(" ")));
    // Les mots de la catégorie finale comptent double.
    const score = cherches.reduce((s, m) => s + (feuille.includes(m) ? 2 : chemin.has(m) ? 1 : 0), 0);
    if (score > 0 && (!meilleure || score > meilleure.score)) meilleure = { code: c.code, score };
  }
  return meilleure?.code ?? null;
}

/** « Lire l'étiquette » : propositions (non enregistrées) pour marque, taille, catégorie et matière (§5.5). */
export async function lireEtiquette(base: Base, ia: ClientIA, utilisateurId: string, image: Buffer) {
  let reduite: Buffer;
  try {
    reduite = await sharp(image)
      .rotate()
      .resize(COTE_IA, COTE_IA, { fit: "inside", withoutEnlargement: true })
      .jpeg()
      .toBuffer();
  } catch {
    throw erreurSaisie("Le fichier envoyé n'est pas une image lisible.");
  }
  const { promptEtiquette } = await lireReglages(base, utilisateurId);
  const reponse = lireJson(
    await ia.generer(promptEtiquette ?? PROMPT_ETIQUETTE_DEFAUT, [
      { type: "image/jpeg", base64: reduite.toString("base64") },
    ]),
  );
  const nomMarque = texte(reponse.marque);
  const marques = nomMarque
    ? await base.select({ id: marque.id, nom: marque.nom }).from(marque).where(eq(marque.utilisateurId, utilisateurId))
    : [];
  const connue = nomMarque ? marques.find((m) => sansAccents(m.nom) === sansAccents(nomMarque)) : undefined;
  const categorieTexte = texte(reponse.categorie);
  return {
    marque: connue?.nom ?? nomMarque,
    taille: texte(reponse.taille),
    categorie: trouverCategorie(categorieTexte),
    categorieTexte,
    matiere: texte(reponse.matiere),
  };
}

export const PROMPTS_DEFAUT = { annonce: PROMPT_ANNONCE_DEFAUT, etiquette: PROMPT_ETIQUETTE_DEFAUT };
