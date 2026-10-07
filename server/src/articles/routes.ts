// Routes de l'API des articles.
import type { FastifyInstance } from "fastify";
import { estCategorie } from "../catalogue/categories.js";
import { COULEURS_MAX, estCouleur, estFormatColis, type FormatColis } from "../catalogue/couleurs.js";
import { type CodeEtat, estEtat } from "../catalogue/etats.js";
import { estStatut } from "../metier/statuts.js";
import { erreurSaisie } from "../outils/erreurs.js";
import {
  centimesFacultatif,
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
  enregistrerLienVinted,
  creerArticle,
  type DonneesArticle,
  listerArticles,
  lireArticle,
  modifierArticle,
} from "./service.js";

function categorieObligatoire(valeur: unknown): string {
  if (valeur === undefined || valeur === null || valeur === "") throw erreurSaisie("Catégorie : obligatoire.");
  if (typeof valeur !== "string" || !estCategorie(valeur)) throw erreurSaisie("Catégorie inconnue.");
  return valeur;
}

function etatObligatoire(valeur: unknown): CodeEtat {
  if (valeur === undefined || valeur === null || valeur === "") throw erreurSaisie("État : obligatoire.");
  if (!estEtat(valeur)) throw erreurSaisie("État inconnu.");
  return valeur;
}

function couleursFacultatives(valeur: unknown): string[] {
  if (valeur === undefined || valeur === null) return [];
  if (!Array.isArray(valeur) || !valeur.every(estCouleur)) throw erreurSaisie("Couleur inconnue.");
  if (valeur.length > COULEURS_MAX) throw erreurSaisie(`${COULEURS_MAX} couleurs au plus.`);
  return [...new Set(valeur)];
}

function formatColisFacultatif(valeur: unknown): FormatColis | null {
  if (valeur === undefined || valeur === null || valeur === "") return null;
  if (!estFormatColis(valeur)) throw erreurSaisie("Format de colis inconnu.");
  return valeur;
}

function lireDonneesArticle(corps: unknown): DonneesArticle {
  const c = objet(corps);
  return {
    nom: texteObligatoire(c.nom, "Nom", 200),
    lieuId: uuidObligatoire(c.lieuId, "Lieu"),
    prixAchat: centimesFacultatif(c.prixAchat, "Prix d'achat"),
    dateAchat: dateObligatoire(c.dateAchat, "Date d'achat"),
    categorie: categorieObligatoire(c.categorie),
    marqueId: uuidObligatoire(c.marqueId, "Marque"),
    etat: etatObligatoire(c.etat),
    gamme: texteFacultatif(c.gamme, "Gamme", 100),
    taille: texteFacultatif(c.taille, "Taille", 50),
    matiere: texteFacultatif(c.matiere, "Matière", 100),
    notes: texteFacultatif(c.notes, "Notes", 2000),
    prixAffiche: centimesFacultatif(c.prixAffiche, "Prix affiché"),
    couleurs: couleursFacultatives(c.couleurs),
    formatColis: formatColisFacultatif(c.formatColis),
  };
}

const idDe = (params: unknown) => uuidObligatoire(objet(params).id, "Identifiant");

/** Lien d'une annonce Vinted (https, site vinted.fr, vinted.be…) ; vide = lien retiré. */
function lienVinted(valeur: unknown): string | null {
  const texte = texteFacultatif(valeur, "Lien Vinted", 500);
  if (texte === null) return null;
  let url: URL;
  try {
    url = new URL(texte);
  } catch {
    throw erreurSaisie("Lien Vinted : adresse invalide (copiez-la depuis Vinted : Partager → Copier le lien).");
  }
  if (url.protocol !== "https:" || !/(^|\.)vinted\.[a-z.]{2,10}$/.test(url.hostname)) {
    throw erreurSaisie("Lien Vinted : l'adresse doit être celle d'une annonce Vinted (https://www.vinted.fr/…).");
  }
  return url.toString();
}

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

  app.put("/api/articles/:id/lien-vinted", async (requete) => {
    const utilisateurId = utilisateurDe(requete).id;
    const id = idDe(requete.params);
    const url = lienVinted(objet(requete.body).url);
    const resultat = await enregistrerLienVinted(base, utilisateurId, id, url, maintenant());
    return { ...resultat, article: await lireArticle(base, utilisateurId, id) };
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
