// Routes de l'API des articles.
import type { FastifyInstance } from "fastify";
import { estStatut } from "../metier/statuts.js";
import { erreurSaisie } from "../outils/erreurs.js";
import {
  centimesFacultatif,
  centimesObligatoire,
  dateObligatoire,
  horodatageFacultatif,
  objet,
  texteFacultatif,
  texteObligatoire,
  uuidFacultatif,
  uuidObligatoire,
} from "../outils/validation.js";
import type { ContexteRoutes } from "../app.js";
import {
  changerStatut,
  corrigerDateHistorique,
  creerArticle,
  type DonneesArticle,
  listerArticles,
  lireArticle,
  modifierArticle,
} from "./service.js";

function lireDonneesArticle(corps: unknown): DonneesArticle {
  const c = objet(corps);
  return {
    nom: texteObligatoire(c.nom, "Nom", 200),
    lieuId: uuidObligatoire(c.lieuId, "Lieu"),
    prixAchat: centimesObligatoire(c.prixAchat, "Prix d'achat"),
    dateAchat: dateObligatoire(c.dateAchat, "Date d'achat"),
    categorieId: uuidFacultatif(c.categorieId, "Catégorie"),
    marqueId: uuidFacultatif(c.marqueId, "Marque"),
    gammeId: uuidFacultatif(c.gammeId, "Gamme"),
    etatId: uuidFacultatif(c.etatId, "État"),
    taille: texteFacultatif(c.taille, "Taille", 50),
    matiere: texteFacultatif(c.matiere, "Matière", 100),
    notes: texteFacultatif(c.notes, "Notes", 2000),
    prixAffiche: centimesFacultatif(c.prixAffiche, "Prix affiché"),
  };
}

const idDe = (params: unknown) => uuidObligatoire(objet(params).id, "Identifiant");

export function routesArticles(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/articles", async (requete) => listerArticles(base, utilisateurDe(requete).id));

  app.post("/api/articles", async (requete, reponse) => {
    const utilisateurId = utilisateurDe(requete).id;
    const idPropose = uuidFacultatif(objet(requete.body).id, "Identifiant");
    const id = await creerArticle(base, utilisateurId, lireDonneesArticle(requete.body), maintenant(), idPropose);
    return reponse.code(201).send(await lireArticle(base, utilisateurId, id));
  });

  app.get("/api/articles/:id", async (requete) => lireArticle(base, utilisateurDe(requete).id, idDe(requete.params)));

  app.put("/api/articles/:id", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await modifierArticle(base, utilisateurId, id, lireDonneesArticle(requete.body), maintenant());
    return lireArticle(base, utilisateurId, id);
  });

  app.post("/api/articles/:id/statut", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    const c = objet(requete.body);
    if (!estStatut(c.vers)) throw erreurSaisie("Statut inconnu.");
    await changerStatut(
      base,
      utilisateurId,
      id,
      {
        vers: c.vers,
        date: horodatageFacultatif(c.date, "Date"),
        prixAffiche: centimesFacultatif(c.prixAffiche, "Prix affiché"),
      },
      maintenant(),
    );
    return lireArticle(base, utilisateurId, id);
  });

  app.put("/api/historique-statuts/:id", async (requete) => {
    const date = horodatageFacultatif(objet(requete.body).date, "Date");
    if (date === null) throw erreurSaisie("Date : obligatoire.");
    await corrigerDateHistorique(base, utilisateurDe(requete).id, idDe(requete.params), date, maintenant());
    return { ok: true };
  });
}
