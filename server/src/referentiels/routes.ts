// Routes de l'API des listes de référence.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { introuvable } from "../outils/erreurs.js";
import { objet, texteObligatoire } from "../outils/validation.js";
import { ajouterValeur, estTypeReferentiel, lireReferentiels } from "./service.js";

export function routesReferentiels(app: FastifyInstance, { base, utilisateurDe }: ContexteRoutes) {
  app.get("/api/referentiels", async (requete) => lireReferentiels(base, utilisateurDe(requete).id));

  app.post("/api/referentiels/:type", async (requete, reponse) => {
    const type = String(objet(requete.params).type);
    if (!estTypeReferentiel(type)) throw introuvable("Liste");
    const nom = texteObligatoire(objet(requete.body).nom, "Nom", 100);
    return reponse.code(201).send(await ajouterValeur(base, utilisateurDe(requete).id, type, nom));
  });
}
