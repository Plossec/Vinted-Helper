// Routes de la publication Vinted : interface (session) et programme du PC (jeton « Bearer »).
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { idDe, lienVintedFacultatif, objet, texteObligatoire, uuidObligatoire } from "../outils/validation.js";
import { planifierTaches } from "../taches/service.js";
import {
  annulerPublication,
  creerJeton,
  demanderPublication,
  demandeSuivante,
  enregistrerResultat,
  listerPublications,
  nombreEnAttente,
  type ResultatProgramme,
} from "./service.js";

export function routesPublication(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  // --- Interface ---
  app.post("/api/publications", async (requete) => {
    const c = objet(requete.body);
    if (!Array.isArray(c.articleIds)) throw erreurSaisie("Articles : liste attendue.");
    const ids = c.articleIds.map((v: unknown) => uuidObligatoire(v, "Article"));
    return demanderPublication(base, utilisateurDe(requete).id, ids, c.essai !== false, maintenant());
  });

  app.get("/api/publications", async (requete) => listerPublications(base, utilisateurDe(requete).id));

  app.delete("/api/publications/:id", async (requete) => {
    await annulerPublication(base, utilisateurDe(requete).id, idDe(requete.params), maintenant());
    return { ok: true };
  });

  app.post("/api/publication/jeton", async (requete) => ({ jeton: await creerJeton(base, utilisateurDe(requete).id) }));

  // --- Programme du PC ---
  app.get("/api/programme/attente", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    // Tâches automatisées (#147) : planifiées au passage de l'extension, qui seule agit sur Vinted. Un échec ici
    // n'empêche jamais la publication.
    try {
      await planifierTaches(base, utilisateurId, maintenant());
    } catch (erreur) {
      requete.log.error({ err: erreur }, "Planification des tâches automatisées impossible");
    }
    return { nombre: await nombreEnAttente(base, utilisateurId, maintenant()) };
  });

  app.get("/api/programme/suivante", async (requete) => ({
    publication: await demandeSuivante(base, utilisateurDe(requete).id, maintenant()),
  }));

  app.post("/api/programme/publications/:id/resultat", async (requete) => {
    const c = objet(requete.body);
    let r: ResultatProgramme;
    if (c.resultat === "publie") {
      // Même contrôle que le lien saisi à la main (issue #128) : uniquement une adresse https de Vinted.
      const url = lienVintedFacultatif(c.url, "Lien de l'annonce");
      if (url === null) throw erreurSaisie("Lien de l'annonce : obligatoire.");
      r = { resultat: "publie", url };
    } else if (c.resultat === "essai") r = { resultat: "essai" };
    else if (c.resultat === "erreur") r = { resultat: "erreur", message: texteObligatoire(c.message, "Message", 1000) };
    else throw erreurSaisie("Résultat inconnu.");
    await enregistrerResultat(base, utilisateurDe(requete).id, idDe(requete.params), r, maintenant());
    return { ok: true };
  });
}
