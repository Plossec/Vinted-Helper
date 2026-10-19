// Fichiers des photos : data/photos/<utilisateur>/<photo>.<ext> + une vignette légère pour les listes.
// Photo enregistrée en JPEG sans métadonnées (#216), en pleine taille tant que l'article est actif (§5.10).
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { erreurSaisie } from "../outils/erreurs.js";

const FORMATS_ACCEPTES = new Set(["jpeg", "png", "webp", "heif"]);
const COTE_VIGNETTE = 400;
/** Taille des photos conservées après la vente ou la sortie du stock (§5.10). */
export const COTE_REDUIT = 1600;

export const nomVignette = (photoId: string) => `${photoId}-vignette.webp`;

/** Photo en JPEG et sa vignette, orientation appliquée, sans aucune métadonnée (sharp ne les recopie pas). */
async function sansMetadonnees(contenu: Buffer): Promise<{ photo: Buffer; vignette: Buffer }> {
  const image = sharp(contenu).autoOrient();
  const [photo, vignette] = await Promise.all([
    image.clone().jpeg({ quality: 90 }).toBuffer(),
    image.clone().resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "cover" }).webp({ quality: 75 }).toBuffer(),
  ]);
  return { photo, vignette };
}

export function creerStockagePhotos(dossier: string) {
  const chemin = (utilisateurId: string, fichier: string) => resolve(dossier, utilisateurId, fichier);

  return {
    chemin,

    /**
     * Vérifie que le contenu est une image, l'enregistre et crée sa vignette. Renvoie le nom du fichier.
     * La photo est réécrite en JPEG, orientation de l'appareil photo appliquée et **sans métadonnées** (position GPS,
     * modèle du téléphone… : issue #216).
     */
    async enregistrer(utilisateurId: string, photoId: string, contenu: Buffer): Promise<string> {
      let format: string | undefined;
      try {
        format = (await sharp(contenu).metadata()).format;
      } catch {
        throw erreurSaisie("Le fichier envoyé n'est pas une image lisible.");
      }
      if (!format || !FORMATS_ACCEPTES.has(format)) {
        throw erreurSaisie("Format de photo non pris en charge (JPEG, PNG, WebP ou HEIC).");
      }
      const { photo, vignette } = await sansMetadonnees(contenu);
      const fichier = `${photoId}.jpg`;
      await mkdir(resolve(dossier, utilisateurId), { recursive: true });
      await writeFile(chemin(utilisateurId, fichier), photo);
      await writeFile(chemin(utilisateurId, nomVignette(photoId)), vignette);
      return fichier;
    },

    /** Vrai si la photo porte encore des métadonnées (EXIF, XMP, IPTC) ou n'est pas un JPEG (photos d'avant #216). */
    async aDesMetadonnees(utilisateurId: string, fichier: string): Promise<boolean> {
      const lu = await sharp(await readFile(chemin(utilisateurId, fichier))).metadata();
      return Boolean(lu.exif || lu.xmp || lu.iptc) || lu.orientation !== undefined || !fichier.endsWith(".jpg");
    },

    /**
     * Réécrit une photo déjà enregistrée en JPEG sans métadonnées (photos d'avant l'issue #216) et recrée sa
     * vignette ; renvoie le nouveau nom de fichier.
     */
    async retirerMetadonnees(utilisateurId: string, photoId: string, fichier: string): Promise<string> {
      const { photo, vignette } = await sansMetadonnees(await readFile(chemin(utilisateurId, fichier)));
      const nouveau = `${photoId}.jpg`;
      if (nouveau === fichier) {
        // Même nom : fichier temporaire puis renommage, pour ne jamais laisser une photo à moitié écrite.
        const temporaire = chemin(utilisateurId, `${photoId}.tmp`);
        await writeFile(temporaire, photo);
        await rename(temporaire, chemin(utilisateurId, nouveau));
      } else {
        await writeFile(chemin(utilisateurId, nouveau), photo);
      }
      await writeFile(chemin(utilisateurId, nomVignette(photoId)), vignette);
      return nouveau;
    },

    /** Réduit la photo à ~1600 px (JPEG) ; renvoie le nouveau nom de fichier. */
    async reduire(utilisateurId: string, photoId: string, fichier: string): Promise<string> {
      const contenu = await readFile(chemin(utilisateurId, fichier));
      const reduite = await sharp(contenu)
        .rotate()
        .resize(COTE_REDUIT, COTE_REDUIT, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      const nouveau = `${photoId}.jpg`;
      await writeFile(chemin(utilisateurId, nouveau), reduite);
      return nouveau;
    },

    /**
     * Fait pivoter la photo d'un quart de tour (sens des aiguilles d'une montre si `angle` = 90), définitivement :
     * fichier réécrit en JPEG (l'orientation de l'appareil photo est appliquée avant) et vignette recréée.
     * Renvoie le nouveau nom de fichier.
     */
    async pivoter(utilisateurId: string, photoId: string, fichier: string, angle: 90 | -90): Promise<string> {
      const contenu = await readFile(chemin(utilisateurId, fichier));
      // Un seul décodage : orientation de l'appareil photo puis quart de tour ; photo et vignette en parallèle.
      const tournee = sharp(contenu).autoOrient().rotate(angle);
      const [photoTournee, vignette] = await Promise.all([
        tournee.clone().jpeg({ quality: 90 }).toBuffer(),
        tournee.clone().resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "cover" }).webp({ quality: 75 }).toBuffer(),
      ]);
      const nouveau = `${photoId}.jpg`;
      await writeFile(chemin(utilisateurId, nouveau), photoTournee);
      await writeFile(chemin(utilisateurId, nomVignette(photoId)), vignette);
      return nouveau;
    },

    /**
     * Supprime l'ancien fichier d'une photo réécrite (réduite, tournée, convertie en .jpg) : à appeler **après** la
     * mise à jour de la base, pour que la base ne désigne jamais un fichier déjà effacé (issue #134).
     */
    async retirerAncien(utilisateurId: string, ancien: string, nouveau: string): Promise<void> {
      if (ancien !== nouveau) await rm(chemin(utilisateurId, ancien), { force: true });
    },

    /** Supprime le fichier et sa vignette (photo qui n'est plus utilisée par aucun article). */
    async supprimer(utilisateurId: string, photoId: string, fichier: string): Promise<void> {
      await rm(chemin(utilisateurId, fichier), { force: true });
      await rm(chemin(utilisateurId, nomVignette(photoId)), { force: true });
    },
  };
}

export type StockagePhotos = ReturnType<typeof creerStockagePhotos>;
