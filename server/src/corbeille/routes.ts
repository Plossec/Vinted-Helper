// Routes de la corbeille.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { objet, uuidObligatoire } from "../outils/validation.js";
import type { StockagePhotos } from "../photos/stockage.js";
import { listerCorbeille, mettreALaCorbeille, restaurer, viderArticle } from "./service.js";

const idDe = (params: unknown) => uuidObligatoire(objet(params).id, "Identifiant");

export function routesCorbeille(
  app: FastifyInstance,
  { base, maintenant, utilisateurDe }: ContexteRoutes,
  stockage: StockagePhotos,
) {
  app.delete("/api/articles/:id", async (requete) => {
    await mettreALaCorbeille(base, utilisateurDe(requete).id, idDe(requete.params), maintenant());
    return { ok: true };
  });

  app.get("/api/corbeille", async (requete) => listerCorbeille(base, utilisateurDe(requete).id));

  app.post("/api/corbeille/:id/restauration", async (requete) => {
    await restaurer(base, utilisateurDe(requete).id, idDe(requete.params), maintenant());
    return { ok: true };
  });

  app.delete("/api/corbeille/:id", async (requete) => {
    await viderArticle(base, stockage, utilisateurDe(requete).id, idDe(requete.params));
    return { ok: true };
  });
}
