// Routes des points relais (#210).
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../utilitaires/erreurs.js";
import {
  booleenFacultatif,
  idDe,
  objet,
  texteFacultatif,
  texteObligatoire,
  uuidFacultatif,
} from "../utilitaires/validation.js";
import { lireVente } from "../ventes/service.js";
import { erreurHoraires, estTransporteur, type Horaires, TRANSPORTEURS } from "./horaires.js";
import {
  ajouterPointRelais,
  choisirPointsRelais,
  type DonneesPointRelais,
  demanderReleveVintedGo,
  enregistrerReleveVintedGo,
  pointVintedGoSuivant,
  type ReleveVintedGo,
  listerPointsRelais,
  modifierPointRelais,
  noterEchecReleveVintedGo,
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
  // Point Vinted Go (#262) : horaires lus par l'extension ; ceux du formulaire sont ignorés (vides à la création,
  // gardés à la modification).
  const vintedGo = c.transporteur === "vinted_go";
  const erreur = vintedGo ? null : erreurHoraires(c.horaires);
  if (erreur) throw erreurSaisie(erreur);
  return {
    transporteur: c.transporteur,
    nom: texteObligatoire(c.nom, "Nom", 100).trim(),
    adresse: texteFacultatif(c.adresse, "Adresse", 200),
    numero: texteFacultatif(c.numero, "Numéro du point", 30),
    url: lienFacultatif(c.url),
    horaires: vintedGo ? [[], [], [], [], [], [], []] : (c.horaires as Horaires),
    notes: texteFacultatif(c.notes, "Notes", 500),
    archive: booleenFacultatif(c.archive, "Archivé") ?? false,
  };
}

/** Champ de point relais d'une vente : absent = inchangé, null = retiré. */
function choixPoint(valeur: unknown, champ: string): string | null | undefined {
  return valeur === undefined ? undefined : uuidFacultatif(valeur, champ);
}

export function routesPointsRelais(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/points-relais", async (requete) =>
    conforme<ListePointsRelais>()({
      transporteurs: TRANSPORTEURS,
      points: await listerPointsRelais(base, utilisateurDe(requete).id),
    }),
  );

  app.post("/api/points-relais", async (requete, reponse) =>
    reponse.code(201).send(await ajouterPointRelais(base, utilisateurDe(requete).id, donnees(requete.body))),
  );

  app.post("/api/points-relais/:id/demander-releve-vinted-go", async (requete) =>
    demanderReleveVintedGo(base, utilisateurDe(requete).id, idDe(requete.params), maintenant()),
  );

  app.get("/api/programme/vinted-go", async (requete) => ({
    point: await pointVintedGoSuivant(base, utilisateurDe(requete).id, maintenant()),
  }));

  app.put("/api/points-relais/:id", async (requete) =>
    modifierPointRelais(base, utilisateurDe(requete).id, idDe(requete.params), donnees(requete.body)),
  );

  // Extension Chrome (jeton « Bearer », routes /api/programme/* seulement) : relevé d'un point Vinted Go, ou son échec.
  app.post("/api/programme/points-relais/:id/releve-vinted-go", async (requete) => {
    const c = objet(requete.body);
    if (c.erreur !== undefined && c.erreur !== null)
      return noterEchecReleveVintedGo(
        base,
        utilisateurDe(requete).id,
        idDe(requete.params),
        texteObligatoire(c.erreur, "Erreur", 500),
        maintenant(),
      );
    const erreur = erreurHoraires(c.horaires);
    if (erreur) throw erreurSaisie(erreur);
    const statuts: readonly string[] = [
      "ouvert",
      "capacite_faible",
      "ferme",
      "hors_service",
      "pas_de_compartiments",
      "ramassage_uniquement",
    ];
    if (typeof c.vintedGoStatut !== "string" || !statuts.includes(c.vintedGoStatut))
      throw erreurSaisie("Statut Vinted Go inconnu.");
    const vintedGoId = texteObligatoire(c.vintedGoId, "Identifiant Vinted Go", 100).trim();
    let capacite: ReleveVintedGo["capacite"] = null;
    if (c.capacite !== undefined && c.capacite !== null) {
      const obj = objet(c.capacite);
      const miseAJour = typeof obj.miseAJour === "string" ? obj.miseAJour : null;
      if (!Array.isArray(obj.tailles)) throw erreurSaisie("Capacité Vinted Go invalide.");
      const tailles: { taille: "xs" | "s" | "m"; disponibles: string | null }[] = obj.tailles.map((v) => {
        const t = objet(v);
        if (t.taille !== "xs" && t.taille !== "s" && t.taille !== "m")
          throw erreurSaisie("Taille de compartiment inconnue.");
        return { taille: t.taille, disponibles: typeof t.disponibles === "string" ? t.disponibles : null };
      });
      capacite = { miseAJour, tailles };
    }
    return enregistrerReleveVintedGo(
      base,
      utilisateurDe(requete).id,
      idDe(requete.params),
      {
        vintedGoId,
        vintedGoStatut: c.vintedGoStatut as ReleveVintedGo["vintedGoStatut"],
        horaires: c.horaires as Horaires,
        capacite,
      },
      maintenant(),
    );
  });

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
