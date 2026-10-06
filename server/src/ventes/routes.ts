// Routes des ventes (colis), sorties du stock, boosts, frais divers et réglages.
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import {
  ajouterBoost,
  ajouterFrais,
  type DonneesFrais,
  listerFrais,
  lireReglages,
  modifierFrais,
  modifierReglages,
  type Reglages,
  supprimerBoost,
  supprimerFrais,
} from "../frais/service.js";
import { lireArticle } from "../articles/service.js";
import { erreurSaisie } from "../outils/erreurs.js";
import {
  centimesFacultatif,
  centimesObligatoire,
  dateObligatoire,
  horodatageFacultatif,
  objet,
  texteFacultatif,
  texteObligatoire,
  uuidObligatoire,
} from "../outils/validation.js";
import {
  annulerSortieStock,
  annulerVente,
  avancerVente,
  creerVente,
  type DemandeSortieStock,
  lireVente,
  modifierVente,
  retourVente,
  sortirDuStock,
} from "./service.js";

const MOTIFS = ["donne", "jete", "revendu", "garde", "perdu"] as const;
const CANAUX = ["vide_grenier", "leboncoin", "main_propre", "autre"] as const;

function listeIds(valeur: unknown, champ: string): string[] {
  if (!Array.isArray(valeur)) throw erreurSaisie(`${champ} : liste attendue.`);
  return valeur.map((v: unknown) => uuidObligatoire(v, champ));
}

const idDe = (params: unknown) => uuidObligatoire(objet(params).id, "Identifiant");

function lireFrais(corps: unknown): DonneesFrais {
  const c = objet(corps);
  return {
    date: dateObligatoire(c.date, "Date"),
    montant: centimesObligatoire(c.montant, "Montant"),
    libelle: texteObligatoire(c.libelle, "Libellé", 200),
  };
}

function entierFacultatif(valeur: unknown, champ: string, min: number, max: number): number | undefined {
  if (valeur === undefined) return undefined;
  if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur < min || valeur > max) {
    throw erreurSaisie(`${champ} : nombre entier entre ${min} et ${max} attendu.`);
  }
  return valeur;
}

export function routesVentes(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  const date = (valeur: unknown) => horodatageFacultatif(valeur, "Date") ?? maintenant();

  app.post("/api/ventes", async (requete, reponse) => {
    const c = objet(requete.body);
    const id = await creerVente(
      base,
      utilisateurDe(requete).id,
      {
        articleIds: listeIds(c.articleIds, "Articles"),
        montantCredite: centimesObligatoire(c.montantCredite, "Montant crédité"),
        emballage: centimesFacultatif(c.emballage, "Emballage"),
        dateVente: date(c.date),
      },
      maintenant(),
    );
    return reponse.code(201).send(await lireVente(base, utilisateurDe(requete).id, id));
  });

  app.get("/api/ventes/:id", async (requete) => lireVente(base, utilisateurDe(requete).id, idDe(requete.params)));

  app.put("/api/ventes/:id", async (requete) => {
    const c = objet(requete.body);
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await modifierVente(base, utilisateurId, id, {
      montantCredite: centimesObligatoire(c.montantCredite, "Montant crédité"),
      emballage: centimesObligatoire(c.emballage, "Emballage"),
    });
    return lireVente(base, utilisateurId, id);
  });

  for (const [action, vers] of [
    ["envoi", "envoye"],
    ["finalisation", "finalise"],
  ] as const) {
    app.post(`/api/ventes/:id/${action}`, async (requete) => {
      const utilisateurId = utilisateurDe(requete).id;
      const id = idDe(requete.params);
      await avancerVente(base, utilisateurId, id, vers, date(objet(requete.body).date), maintenant());
      return lireVente(base, utilisateurId, id);
    });
  }

  app.post("/api/ventes/:id/annulation", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await annulerVente(base, utilisateurId, id, date(objet(requete.body).date), maintenant());
    return lireVente(base, utilisateurId, id);
  });

  app.post("/api/ventes/:id/retour", async (requete) => {
    const c = objet(requete.body);
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await retourVente(
      base,
      utilisateurId,
      id,
      {
        articleIds: listeIds(c.articleIds, "Articles renvoyés"),
        montantCredite: centimesFacultatif(c.montantCredite, "Nouveau montant crédité"),
        date: date(c.date),
      },
      maintenant(),
    );
    return lireVente(base, utilisateurId, id);
  });

  app.post("/api/articles/:id/sortie-stock", async (requete) => {
    const c = objet(requete.body);
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    if (!MOTIFS.includes(c.motif as (typeof MOTIFS)[number])) throw erreurSaisie("Motif : obligatoire.");
    if (c.canal != null && !CANAUX.includes(c.canal as (typeof CANAUX)[number])) throw erreurSaisie("Canal inconnu.");
    const demande: DemandeSortieStock = {
      motif: c.motif as DemandeSortieStock["motif"],
      canal: (c.canal ?? null) as DemandeSortieStock["canal"],
      prixRevente: centimesFacultatif(c.prixRevente, "Prix de revente"),
      date: date(c.date),
    };
    await sortirDuStock(base, utilisateurId, id, demande, maintenant());
    return lireArticle(base, utilisateurId, id);
  });

  app.post("/api/articles/:id/annulation-sortie-stock", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await annulerSortieStock(base, utilisateurId, id, date(objet(requete.body).date), maintenant());
    return lireArticle(base, utilisateurId, id);
  });

  app.post("/api/articles/:id/boosts", async (requete, reponse) => {
    const c = objet(requete.body);
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    await ajouterBoost(base, utilisateurId, id, {
      montant: centimesObligatoire(c.montant, "Montant"),
      date: dateObligatoire(c.date, "Date"),
    });
    return reponse.code(201).send(await lireArticle(base, utilisateurId, id));
  });

  app.delete("/api/boosts/:id", async (requete) => {
    await supprimerBoost(base, utilisateurDe(requete).id, idDe(requete.params));
    return { ok: true };
  });

  app.get("/api/frais", async (requete) => listerFrais(base, utilisateurDe(requete).id));

  app.post("/api/frais", async (requete, reponse) => {
    const id = await ajouterFrais(base, utilisateurDe(requete).id, lireFrais(requete.body));
    return reponse.code(201).send({ id });
  });

  app.put("/api/frais/:id", async (requete) => {
    await modifierFrais(base, utilisateurDe(requete).id, idDe(requete.params), lireFrais(requete.body));
    return { ok: true };
  });

  app.delete("/api/frais/:id", async (requete) => {
    await supprimerFrais(base, utilisateurDe(requete).id, idDe(requete.params));
    return { ok: true };
  });

  app.get("/api/reglages", async (requete) => lireReglages(base, utilisateurDe(requete).id));

  app.put("/api/reglages", async (requete) => {
    const c = objet(requete.body);
    const modif: Partial<Reglages> = {};
    const emballage = centimesFacultatif(c.emballageDefaut, "Emballage par défaut");
    if (emballage !== null) modif.emballageDefaut = emballage;
    const delaiBrouillon = entierFacultatif(c.delaiBrouillon, "Délai brouillon", 1, 365);
    if (delaiBrouillon !== undefined) modif.delaiBrouillon = delaiBrouillon;
    const delaiDormant = entierFacultatif(c.delaiDormant, "Délai dormant", 1, 365);
    if (delaiDormant !== undefined) modif.delaiDormant = delaiDormant;
    if ("promptAnnonce" in c) modif.promptAnnonce = texteFacultatif(c.promptAnnonce, "Prompt annonce", 5000);
    if ("promptEtiquette" in c) modif.promptEtiquette = texteFacultatif(c.promptEtiquette, "Prompt étiquette", 5000);
    return modifierReglages(base, utilisateurDe(requete).id, modif);
  });
}
