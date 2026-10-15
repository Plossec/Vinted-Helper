// Routes des tâches automatisées (#147) : liste à valider, journal, « Appliquer » / « Refuser ».
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { objet } from "../outils/validation.js";
import { listerActions, validerActions } from "./service.js";

function idsObligatoires(valeur: unknown): string[] {
  if (!Array.isArray(valeur) || !valeur.every((v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)))
    throw erreurSaisie("Actions : liste d'identifiants attendue.");
  return [...new Set(valeur as string[])];
}

export function routesTaches(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/taches/actions", async (requete) => listerActions(base, utilisateurDe(requete).id, maintenant()));

  app.post("/api/taches/actions/appliquer", async (requete) => ({
    nombre: await validerActions(
      base,
      utilisateurDe(requete).id,
      idsObligatoires(objet(requete.body).ids),
      true,
      maintenant(),
    ),
  }));

  app.post("/api/taches/actions/refuser", async (requete) => ({
    nombre: await validerActions(
      base,
      utilisateurDe(requete).id,
      idsObligatoires(objet(requete.body).ids),
      false,
      maintenant(),
    ),
  }));
}
