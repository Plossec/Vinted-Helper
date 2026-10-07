// Routes des photos : envoi (contenu brut de l'image), lecture, rattachement aux articles.
import { createReadStream, existsSync, statSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie, introuvable } from "../outils/erreurs.js";
import { objet, uuidFacultatif, uuidObligatoire } from "../outils/validation.js";
import {
  ajouterPhotoArticle,
  enregistrerPhoto,
  lirePhoto,
  ordonnerPhotos,
  pivoterPhoto,
  retirerPhoto,
} from "./service.js";
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
    const infos = statSync(chemin);
    // Empreinte du fichier : une photo peut changer de contenu (réduction, rotation) sous le même identifiant.
    const empreinte = `"${Math.trunc(infos.mtimeMs).toString(36)}-${infos.size.toString(36)}"`;
    return { chemin, empreinte, type };
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
      const { chemin, empreinte, type } = vignette
        ? await envoyerFichier(utilisateurId, nomVignette(id), "image/webp")
        : await envoyerFichier(utilisateurId, fichier, TYPES_FICHIER[extension] ?? "application/octet-stream");
      // Gardée en cache par le navigateur, mais revérifiée à chaque affichage (304 si elle n'a pas changé).
      reponse.header("Cache-Control", "private, no-cache").header("ETag", empreinte);
      if (requete.headers["if-none-match"] === empreinte) return reponse.code(304).send();
      return reponse.header("Content-Type", type).send(createReadStream(chemin));
    });
  }

  app.post("/api/photos/:id/rotation", async (requete) => {
    const id = uuidObligatoire(objet(requete.params).id, "Identifiant");
    const sens = objet(requete.body).sens;
    if (sens !== "gauche" && sens !== "droite") throw erreurSaisie("Sens de rotation : « gauche » ou « droite ».");
    await pivoterPhoto(base, stockage, utilisateurDe(requete).id, id, sens === "droite" ? 90 : -90);
    return { ok: true };
  });

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
