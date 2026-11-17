// Routes des points relais (#210).
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../outils/erreurs.js";
import {
  booleenFacultatif,
  idDe,
  objet,
  texteFacultatif,
  texteObligatoire,
  uuidFacultatif,
} from "../outils/validation.js";
import { lireVente } from "../ventes/service.js";
import { erreurHoraires, estTransporteur, type Horaires, TRANSPORTEURS } from "./horaires.js";
import {
  ajouterPointRelais,
  choisirPointsRelais,
  type DonneesPointRelais,
  listerPointsRelais,
  modifierPointRelais,
} from "./service.js";
import type { ListePointsRelais } from "../api/types.js";
import { conforme } from "../api/conforme.js";

/** Page officielle du point : adresse web en https. */
function lienFacultatif(valeur: unknown): string | null {
  const texte = texteFacultatif(valeur, "Lien", 500);
  if (texte === null) return null;
  let url: URL;
  try {
    url = new URL(texte);
  } catch {
    throw erreurSaisie("Lien : adresse invalide (ex. https://…).");
  }
  if (url.protocol !== "https:") throw erreurSaisie("Lien : l'adresse doit commencer par https://.");
  return url.toString();
}

function donnees(corps: unknown): DonneesPointRelais {
  const c = objet(corps);
  if (!estTransporteur(c.transporteur)) throw erreurSaisie("Transporteur inconnu.");
  const erreur = erreurHoraires(c.horaires);
  if (erreur) throw erreurSaisie(erreur);
  return {
    transporteur: c.transporteur,
    nom: texteObligatoire(c.nom, "Nom", 100).trim(),
    adresse: texteFacultatif(c.adresse, "Adresse", 200),
    numero: texteFacultatif(c.numero, "Numéro du point", 30),
    url: lienFacultatif(c.url),
    horaires: c.horaires as Horaires,
    notes: texteFacultatif(c.notes, "Notes", 500),
    archive: booleenFacultatif(c.archive, "Archivé") ?? false,
  };
}

/** Champ de point relais d'une vente : absent = inchangé, null = retiré. */
function choixPoint(valeur: unknown, champ: string): string | null | undefined {
  return valeur === undefined ? undefined : uuidFacultatif(valeur, champ);
}

export function routesPointsRelais(app: FastifyInstance, { base, utilisateurDe }: ContexteRoutes) {
  app.get("/api/points-relais", async (requete) =>
    conforme<ListePointsRelais>()({
      transporteurs: TRANSPORTEURS,
      points: await listerPointsRelais(base, utilisateurDe(requete).id),
    }),
  );

  app.post("/api/points-relais", async (requete, reponse) =>
    reponse.code(201).send(await ajouterPointRelais(base, utilisateurDe(requete).id, donnees(requete.body))),
  );

  app.put("/api/points-relais/:id", async (requete) =>
    modifierPointRelais(base, utilisateurDe(requete).id, idDe(requete.params), donnees(requete.body)),
  );

  app.put("/api/ventes/:id/points-relais", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    const c = objet(requete.body);
    await choisirPointsRelais(base, utilisateurId, id, {
      pointDepotId: choixPoint(c.pointDepotId, "Point de dépôt"),
      pointRetraitId: choixPoint(c.pointRetraitId, "Point de retrait"),
    });
    return lireVente(base, utilisateurId, id);
  });
}
