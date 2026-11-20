// Routes de la corbeille.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../utilitaires/erreurs.js";
import { idDe, objet, uuidObligatoire } from "../utilitaires/validation.js";
import type { StockagePhotos } from "../photos/stockage.js";
import {
  listerCorbeille,
  mettreALaCorbeille,
  mettreALaCorbeilleEnLot,
  restaurer,
  restaurerEnLot,
  viderArticle,
} from "./service.js";
import type { ArticleSupprime, BilanCorbeille } from "../api/types.js";
import { conforme } from "../api/conforme.js";

export function routesCorbeille(
  app: FastifyInstance,
  { base, maintenant, utilisateurDe }: ContexteRoutes,
  stockage: StockagePhotos,
) {
  app.delete("/api/articles/:id", async (requete) => {
    await mettreALaCorbeille(base, utilisateurDe(requete).id, idDe(requete.params), maintenant());
    return { ok: true };
  });

  /** Identifiants d'articles d'une demande en lot (#286). */
  const idsDe = (corps: unknown) => {
    const c = objet(corps);
    if (!Array.isArray(c.ids)) throw erreurSaisie("Articles : liste attendue.");
    return [...new Set(c.ids.map((v: unknown) => uuidObligatoire(v, "Article")))];
  };

  app.post("/api/articles/corbeille", async (requete) =>
    conforme<BilanCorbeille>()(
      await mettreALaCorbeilleEnLot(base, utilisateurDe(requete).id, idsDe(requete.body), maintenant()),
    ),
  );

  app.post("/api/corbeille/restauration", async (requete) =>
    conforme<BilanCorbeille>()(
      await restaurerEnLot(base, utilisateurDe(requete).id, idsDe(requete.body), maintenant()),
    ),
  );

  app.get("/api/corbeille", async (requete) =>
    conforme<ArticleSupprime[]>()(await listerCorbeille(base, utilisateurDe(requete).id)),
  );

  app.post("/api/corbeille/:id/restauration", async (requete) => {
    await restaurer(base, utilisateurDe(requete).id, idDe(requete.params), maintenant());
    return { ok: true };
  });

  app.delete("/api/corbeille/:id", async (requete) => {
    await viderArticle(base, stockage, utilisateurDe(requete).id, idDe(requete.params));
    return { ok: true };
  });
}
