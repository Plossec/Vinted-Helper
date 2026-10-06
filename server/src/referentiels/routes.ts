// Routes de l'API des listes de référence.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { introuvable } from "../outils/erreurs.js";
import { objet, texteObligatoire, uuidObligatoire } from "../outils/validation.js";
import {
  ajouterValeur,
  estTypeReferentiel,
  fusionner,
  listerAvecUsage,
  lireReferentiels,
  renommer,
  type TypeReferentiel,
} from "./service.js";

function typeDe(params: unknown): TypeReferentiel {
  const type = String(objet(params).type);
  if (!estTypeReferentiel(type)) throw introuvable("Liste");
  return type;
}

export function routesReferentiels(app: FastifyInstance, { base, utilisateurDe }: ContexteRoutes) {
  app.get("/api/referentiels", async (requete) => lireReferentiels(base, utilisateurDe(requete).id));

  app.post("/api/referentiels/:type", async (requete, reponse) => {
    const type = String(objet(requete.params).type);
    if (!estTypeReferentiel(type)) throw introuvable("Liste");
    const nom = texteObligatoire(objet(requete.body).nom, "Nom", 100);
    return reponse.code(201).send(await ajouterValeur(base, utilisateurDe(requete).id, type, nom));
  });

  app.get("/api/referentiels/:type", async (requete) =>
    listerAvecUsage(base, utilisateurDe(requete).id, typeDe(requete.params)),
  );

  app.put("/api/referentiels/:type/:id", async (requete) => {
    const p = objet(requete.params);
    const nom = texteObligatoire(objet(requete.body).nom, "Nom", 100);
    await renommer(base, utilisateurDe(requete).id, typeDe(p), uuidObligatoire(p.id, "Identifiant"), nom);
    return { ok: true };
  });

  app.post("/api/referentiels/:type/:id/fusion", async (requete) => {
    const p = objet(requete.params);
    const cibleId = uuidObligatoire(objet(requete.body).cibleId, "Valeur conservée");
    await fusionner(base, utilisateurDe(requete).id, typeDe(p), uuidObligatoire(p.id, "Identifiant"), cibleId);
    return { ok: true };
  });
}
