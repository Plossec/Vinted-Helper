// Routes de l'IA : génération d'annonce, prompt à copier, annonce modifiée, lecture d'étiquette.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { lireArticle } from "../articles/service.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { objet, texteFacultatif, uuidObligatoire } from "../outils/validation.js";
import type { StockagePhotos } from "../photos/stockage.js";
import type { ClientIA } from "./gemini.js";
import { genererAnnonce, lireEtiquette, modifierAnnonce, promptAnnonce, PROMPTS_DEFAUT } from "./service.js";

const idDe = (params: unknown) => uuidObligatoire(objet(params).id, "Identifiant");

export function routesIA(
  app: FastifyInstance,
  { base, maintenant, utilisateurDe }: ContexteRoutes,
  stockage: StockagePhotos,
  ia: ClientIA,
) {
  app.post("/api/articles/:id/annonce/generation", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await genererAnnonce(base, stockage, ia, utilisateurId, id, maintenant());
    return lireArticle(base, utilisateurId, id);
  });

  app.get("/api/articles/:id/annonce/prompt", async (requete) => {
    const { prompt } = await promptAnnonce(base, utilisateurDe(requete).id, idDe(requete.params));
    return { prompt };
  });

  app.put("/api/articles/:id/annonce", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    const c = objet(requete.body);
    await modifierAnnonce(
      base,
      utilisateurId,
      id,
      {
        titre: texteFacultatif(c.titre, "Titre", 100),
        description: texteFacultatif(c.description, "Description", 5000),
      },
      maintenant(),
    );
    return lireArticle(base, utilisateurId, id);
  });

  app.post("/api/etiquette", async (requete) => {
    if (!Buffer.isBuffer(requete.body) || requete.body.length === 0)
      throw erreurSaisie("Photo de l'étiquette manquante.");
    return lireEtiquette(base, ia, utilisateurDe(requete).id, requete.body);
  });

  app.get("/api/prompts/defaut", async () => PROMPTS_DEFAUT);
}
