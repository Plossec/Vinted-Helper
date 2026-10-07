// Fichiers des photos : data/photos/<utilisateur>/<photo>.<ext> + une vignette légère pour les listes.
// L'original est conservé en pleine qualité (§5.10) ; la réduction à ~1600 px arrive au lot 7.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { erreurSaisie } from "../outils/erreurs.js";

const EXTENSIONS: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp", heif: "heic" };
const COTE_VIGNETTE = 400;
/** Taille des photos conservées après la vente ou la sortie du stock (§5.10). */
export const COTE_REDUIT = 1600;

export const nomVignette = (photoId: string) => `${photoId}-vignette.webp`;

export function creerStockagePhotos(dossier: string) {
  const chemin = (utilisateurId: string, fichier: string) => resolve(dossier, utilisateurId, fichier);

  return {
    chemin,

    /** Vérifie que le contenu est une image, l'enregistre et crée sa vignette. Renvoie le nom du fichier. */
    async enregistrer(utilisateurId: string, photoId: string, contenu: Buffer): Promise<string> {
      let format: string | undefined;
      try {
        format = (await sharp(contenu).metadata()).format;
      } catch {
        throw erreurSaisie("Le fichier envoyé n'est pas une image lisible.");
      }
      const extension = format ? EXTENSIONS[format] : undefined;
      if (!extension) throw erreurSaisie("Format de photo non pris en charge (JPEG, PNG, WebP ou HEIC).");
      const fichier = `${photoId}.${extension}`;
      await mkdir(resolve(dossier, utilisateurId), { recursive: true });
      await writeFile(chemin(utilisateurId, fichier), contenu);
      const vignette = await sharp(contenu)
        .rotate() // respecte l'orientation de l'appareil photo
        .resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "cover" })
        .webp({ quality: 75 })
        .toBuffer();
      await writeFile(chemin(utilisateurId, nomVignette(photoId)), vignette);
      return fichier;
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
      if (nouveau !== fichier) await rm(chemin(utilisateurId, fichier), { force: true });
      return nouveau;
    },

    /**
     * Fait pivoter la photo d'un quart de tour (sens des aiguilles d'une montre si `angle` = 90), définitivement :
     * fichier réécrit en JPEG (l'orientation de l'appareil photo est appliquée avant) et vignette recréée.
     * Renvoie le nouveau nom de fichier.
     */
    async pivoter(utilisateurId: string, photoId: string, fichier: string, angle: 90 | -90): Promise<string> {
      const contenu = await readFile(chemin(utilisateurId, fichier));
      const tournee = await sharp(await sharp(contenu).rotate().toBuffer())
        .rotate(angle)
        .jpeg({ quality: 92 })
        .toBuffer();
      const nouveau = `${photoId}.jpg`;
      await writeFile(chemin(utilisateurId, nouveau), tournee);
      if (nouveau !== fichier) await rm(chemin(utilisateurId, fichier), { force: true });
      const vignette = await sharp(tournee)
        .resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "cover" })
        .webp({ quality: 75 })
        .toBuffer();
      await writeFile(chemin(utilisateurId, nomVignette(photoId)), vignette);
      return nouveau;
    },

    /** Supprime le fichier et sa vignette (photo qui n'est plus utilisée par aucun article). */
    async supprimer(utilisateurId: string, photoId: string, fichier: string): Promise<void> {
      await rm(chemin(utilisateurId, fichier), { force: true });
      await rm(chemin(utilisateurId, nomVignette(photoId)), { force: true });
    },
  };
}

export type StockagePhotos = ReturnType<typeof creerStockagePhotos>;
