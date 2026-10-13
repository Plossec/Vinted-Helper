// Routes de l'IA : génération d'annonce, prompt à copier, annonce modifiée, lecture d'étiquette.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { lireArticle } from "../articles/service.js";
import { creerLimiteur } from "../compte/limiteur.js";
import { ErreurMetier, erreurSaisie } from "../outils/erreurs.js";
import { idDe, objet, texteFacultatif } from "../outils/validation.js";
import type { StockagePhotos } from "../photos/stockage.js";
import type { ClientIA } from "./gemini.js";
import { genererAnnonce, lireEtiquette, modifierAnnonce, promptAnnonce, PROMPTS_DEFAUT } from "./service.js";

/** Appels à Gemini par utilisateur et par heure (#135) : préserve le quota gratuit contre une rafale. */
export const LIMITE_IA = { max: 30, fenetreMs: 60 * 60 * 1000 };

export function routesIA(
  app: FastifyInstance,
  { base, maintenant, utilisateurDe }: ContexteRoutes,
  stockage: StockagePhotos,
  ia: ClientIA,
) {
  const limiteur = creerLimiteur(LIMITE_IA);
  /** Compte un appel à Gemini ; refuse (429) au-delà de la limite, avec le délai d'attente. */
  function compterAppelIA(utilisateurId: string) {
    const instant = maintenant().getTime();
    const attente = limiteur.attente(utilisateurId, instant);
    if (attente > 0) {
      const minutes = Math.max(1, Math.ceil(attente / 60_000));
      throw new ErreurMetier(
        429,
        `Limite de ${LIMITE_IA.max} appels à l'IA par heure atteinte. Réessayez dans ${minutes} min.`,
      );
    }
    limiteur.noterEchec(utilisateurId, instant);
  }

  app.post("/api/articles/:id/annonce/generation", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    compterAppelIA(utilisateurId);
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
    const utilisateurId = utilisateurDe(requete).id;
    compterAppelIA(utilisateurId);
    return lireEtiquette(base, ia, utilisateurId, requete.body);
  });

  app.get("/api/prompts/defaut", async (requete) => {
    utilisateurDe(requete);
    return PROMPTS_DEFAUT;
  });
}
