// Routes des sorties, des achats terrain et des lots.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { creerAchat, modifierPrixLot, NOMBRE_MAX_ARTICLES } from "../achats/service.js";
import { erreurSaisie } from "../outils/erreurs.js";
import {
  centimesFacultatif,
  centimesObligatoire,
  dateObligatoire,
  objet,
  texteFacultatif,
  uuidFacultatif,
  uuidObligatoire,
} from "../outils/validation.js";
import {
  creerSortie,
  type DonneesSortie,
  listerSorties,
  lireSortie,
  modifierEssence,
  modifierSortie,
} from "./service.js";

function lireDonneesSortie(corps: unknown): DonneesSortie {
  const c = objet(corps);
  return {
    date: dateObligatoire(c.date, "Date"),
    lieuId: uuidObligatoire(c.lieuId, "Lieu"),
    notes: texteFacultatif(c.notes, "Notes", 2000),
  };
}

const idDe = (params: unknown) => uuidObligatoire(objet(params).id, "Identifiant");

export function routesSorties(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/sorties", async (requete) => listerSorties(base, utilisateurDe(requete).id));

  app.post("/api/sorties", async (requete, reponse) => {
    const utilisateurId = utilisateurDe(requete).id;
    const c = objet(requete.body);
    const id = uuidObligatoire(c.id, "Identifiant");
    const essence = centimesFacultatif(c.montantEssence, "Essence") ?? 0;
    await creerSortie(base, utilisateurId, id, lireDonneesSortie(c), essence, maintenant());
    return reponse.code(201).send(await lireSortie(base, utilisateurId, id));
  });

  app.get("/api/sorties/:id", async (requete) => lireSortie(base, utilisateurDe(requete).id, idDe(requete.params)));

  app.put("/api/sorties/:id", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await modifierSortie(base, utilisateurId, id, lireDonneesSortie(requete.body));
    return lireSortie(base, utilisateurId, id);
  });

  app.put("/api/sorties/:id/essence", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await modifierEssence(base, utilisateurId, id, centimesObligatoire(objet(requete.body).montantEssence, "Essence"));
    return lireSortie(base, utilisateurId, id);
  });

  app.post("/api/achats", async (requete, reponse) => {
    const c = objet(requete.body);
    if (!Array.isArray(c.articleIds)) throw erreurSaisie("Identifiants des articles : liste attendue.");
    if (c.articleIds.length > NOMBRE_MAX_ARTICLES) {
      throw erreurSaisie(`Nombre d'articles : entre 1 et ${NOMBRE_MAX_ARTICLES}.`);
    }
    const sortieId = uuidFacultatif(c.sortieId, "Sortie");
    const articleIds = await creerAchat(
      base,
      utilisateurDe(requete).id,
      {
        id: uuidObligatoire(c.id, "Identifiant"),
        articleIds: c.articleIds.map((v: unknown) => uuidObligatoire(v, "Identifiant d'article")),
        sortieId,
        prixTotal: sortieId === null ? 0 : centimesObligatoire(c.prixTotal, "Prix"),
        photoId: uuidFacultatif(c.photoId, "Photo"),
        date: dateObligatoire(c.date, "Date"),
      },
      maintenant(),
    );
    return reponse.code(201).send({ articleIds });
  });

  app.put("/api/lots/:id", async (requete) => {
    const prixTotal = centimesObligatoire(objet(requete.body).prixTotal, "Prix total du lot");
    await modifierPrixLot(base, utilisateurDe(requete).id, idDe(requete.params), prixTotal);
    return { ok: true };
  });
}
