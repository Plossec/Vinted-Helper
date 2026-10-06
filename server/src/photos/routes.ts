// Routes des photos : envoi (contenu brut de l'image), lecture, rattachement aux articles.
import { createReadStream, existsSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie, introuvable } from "../outils/erreurs.js";
import { objet, uuidFacultatif, uuidObligatoire } from "../outils/validation.js";
import { ajouterPhotoArticle, enregistrerPhoto, lirePhoto, ordonnerPhotos, retirerPhoto } from "./service.js";
import { nomVignette, type StockagePhotos } from "./stockage.js";

/** Taille maximale d'une photo envoyée (les photos de téléphone font quelques Mo). */
const TAILLE_MAX_PHOTO = 30 * 1024 * 1024;
const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/octet-stream"];

export function routesPhotos(
  app: FastifyInstance,
  { base, maintenant, utilisateurDe }: ContexteRoutes,
  stockage: StockagePhotos,
) {
  app.addContentTypeParser(TYPES_IMAGE, { parseAs: "buffer", bodyLimit: TAILLE_MAX_PHOTO }, (_requete, corps, fini) =>
    fini(null, corps),
  );

  app.put("/api/photos/:id", async (requete) => {
    const id = uuidObligatoire(objet(requete.params).id, "Identifiant");
    const type = objet(requete.query).type ?? "terrain";
    if (type !== "terrain" && type !== "annonce") throw erreurSaisie("Type de photo inconnu.");
    if (!Buffer.isBuffer(requete.body) || requete.body.length === 0) throw erreurSaisie("Photo manquante.");
    await enregistrerPhoto(base, stockage, utilisateurDe(requete).id, id, type, requete.body, maintenant());
    return { id };
  });

  async function envoyerFichier(utilisateurId: string, fichier: string, type: string) {
    const chemin = stockage.chemin(utilisateurId, fichier);
    if (!existsSync(chemin)) throw introuvable("Photo");
    return { flux: createReadStream(chemin), type };
  }

  const TYPES_FICHIER: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  for (const vignette of [false, true]) {
    app.get(vignette ? "/api/photos/:id/vignette" : "/api/photos/:id", async (requete, reponse) => {
      const utilisateurId = utilisateurDe(requete).id;
      const id = uuidObligatoire(objet(requete.params).id, "Identifiant");
      const { fichier } = await lirePhoto(base, utilisateurId, id);
      const extension = fichier.split(".").pop() ?? "";
      const { flux, type } = vignette
        ? await envoyerFichier(utilisateurId, nomVignette(id), "image/webp")
        : await envoyerFichier(utilisateurId, fichier, TYPES_FICHIER[extension] ?? "application/octet-stream");
      // Une photo ne change jamais de contenu sous le même identifiant (sauf réduction au lot 7) : cache long.
      return reponse.header("Content-Type", type).header("Cache-Control", "private, max-age=604800").send(flux);
    });
  }

  app.post("/api/articles/:id/photos", async (requete, reponse) => {
    const articleId = uuidObligatoire(objet(requete.params).id, "Identifiant");
    const photoId = uuidObligatoire(objet(requete.body).photoId, "Photo");
    await ajouterPhotoArticle(base, utilisateurDe(requete).id, articleId, photoId);
    return reponse.code(201).send({ ok: true });
  });

  app.put("/api/articles/:id/photos", async (requete) => {
    const articleId = uuidObligatoire(objet(requete.params).id, "Identifiant");
    const c = objet(requete.body);
    if (!Array.isArray(c.ordre)) throw erreurSaisie("Ordre des photos : liste attendue.");
    const ordre = c.ordre.map((v: unknown) => uuidObligatoire(v, "Photo"));
    await ordonnerPhotos(base, utilisateurDe(requete).id, articleId, ordre, uuidFacultatif(c.principale, "Photo"));
    return { ok: true };
  });

  app.delete("/api/articles/:id/photos/:photoId", async (requete) => {
    const p = objet(requete.params);
    const articleId = uuidObligatoire(p.id, "Identifiant");
    const photoId = uuidObligatoire(p.photoId, "Photo");
    await retirerPhoto(base, stockage, utilisateurDe(requete).id, articleId, photoId);
    return { ok: true };
  });
}
