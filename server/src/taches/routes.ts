// Routes des tâches automatisées (#147) : liste à valider, journal, « Appliquer » / « Refuser ».
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { idDe, lienVintedFacultatif, objet, texteObligatoire } from "../outils/validation.js";
import {
  actionSuivante,
  enregistrerResultatAction,
  listerActions,
  type ResultatAction,
  validerActions,
} from "./service.js";

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

  // --- Extension Chrome (jeton « Bearer ») ---
  app.get("/api/programme/action-suivante", async (requete) => ({
    action: await actionSuivante(base, utilisateurDe(requete).id, maintenant()),
  }));

  app.post("/api/programme/actions/:id/resultat", async (requete) => {
    const c = objet(requete.body);
    let r: ResultatAction;
    if (c.resultat === "essai") r = { resultat: "essai" };
    else if (c.resultat === "fait")
      // Même contrôle que pour la publication (#128) : uniquement une adresse https de Vinted.
      r = { resultat: "fait", url: lienVintedFacultatif(c.url, "Lien de l'annonce") };
    else if (c.resultat === "erreur")
      r = {
        resultat: "erreur",
        message: texteObligatoire(c.message, "Message", 1000),
        annonceSupprimee: c.annonceSupprimee === true,
      };
    else throw erreurSaisie("Résultat inconnu.");
    await enregistrerResultatAction(base, utilisateurDe(requete).id, idDe(requete.params), r, maintenant());
    return { ok: true };
  });
}
