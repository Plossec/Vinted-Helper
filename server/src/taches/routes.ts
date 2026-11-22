// Routes des tâches automatisées (#147) : liste à valider, journal, « Appliquer » / « Refuser ».
import type { FastifyInstance } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { erreurSaisie } from "../utilitaires/erreurs.js";
import { idDe, lienVintedFacultatif, objet, texteObligatoire, uuidObligatoire } from "../utilitaires/validation.js";
import {
  appliquerCommandes,
  type CommandeLue,
  ecarterCommandes,
  lancerFinalisation,
  listerCommandes,
  marquerMontantVu,
  rattacherCommande,
  recevoirCommandes,
} from "./finalisation.js";
import {
  enregistrerResultatOffre,
  type FavoriLu,
  lancerFavoris,
  offreSuivante,
  recevoirFavoris,
  type ResultatOffre,
} from "./favoris.js";
import { ETATS_JOURNAL, etatTaches, type FiltresJournal, listerJournal, TACHES } from "./journal.js";
import {
  actionSuivante,
  enregistrerResultatAction,
  lancerDormants,
  listerActions,
  type ResultatAction,
  validerActions,
} from "./service.js";
import type { ActionsAValider, CommandesVintedListe, EtatTaches, LigneJournal } from "../api/types.js";
import { conforme } from "../api/conforme.js";

function idsObligatoires(valeur: unknown): string[] {
  if (!Array.isArray(valeur) || !valeur.every((v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)))
    throw erreurSaisie("Actions : liste d'identifiants attendue.");
  return [...new Set(valeur as string[])];
}

export function routesTaches(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  app.get("/api/taches/actions", async (requete) =>
    conforme<ActionsAValider>()(await listerActions(base, utilisateurDe(requete).id, maintenant())),
  );

  // Refonte (#232, #233) : état de chaque tâche, journal de toutes les tâches avec ses filtres.
  app.get("/api/taches/etat", async (requete) =>
    conforme<EtatTaches>()(await etatTaches(base, utilisateurDe(requete).id, maintenant())),
  );
  app.get("/api/taches/journal", async (requete) =>
    conforme<{ lignes: LigneJournal[] }>()({
      lignes: await listerJournal(base, utilisateurDe(requete).id, lireFiltres(requete.query), maintenant()),
    }),
  );

  // « Lancer maintenant » (#230) : à toute heure, même tâche désactivée ; les dormants ignorent aussi les plafonds.
  app.post("/api/taches/dormants/lancer", async (requete) => ({
    actions: await lancerDormants(base, utilisateurDe(requete).id, maintenant()),
  }));
  app.post("/api/taches/favoris/lancer", async (requete) => {
    await lancerFavoris(base, utilisateurDe(requete).id, maintenant());
    return { ok: true };
  });
  app.post("/api/taches/finalisation/lancer", async (requete) => {
    await lancerFinalisation(base, utilisateurDe(requete).id, maintenant());
    return { ok: true };
  });

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
        releve: c.releve === true,
      };
    else throw erreurSaisie("Résultat inconnu.");
    await enregistrerResultatAction(base, utilisateurDe(requete).id, idDe(requete.params), r, maintenant());
    return { ok: true };
  });

  // --- Tâche « Offres aux favoris » (#149) : extension Chrome (jeton) ---
  app.post("/api/programme/favoris", async (requete) => {
    const c = objet(requete.body);
    if (!Array.isArray(c.favoris) || c.favoris.length > 500)
      throw erreurSaisie("Favoris : liste attendue (500 au plus).");
    const favoris: FavoriLu[] = c.favoris.map((brut: unknown, i: number) => lireFavori(brut, i));
    const erreur = c.erreur === undefined || c.erreur === null ? null : texteObligatoire(c.erreur, "Erreur", 1000);
    return recevoirFavoris(base, utilisateurDe(requete).id, { favoris, erreur }, maintenant());
  });

  app.get("/api/programme/offre-suivante", async (requete) => ({
    offre: await offreSuivante(base, utilisateurDe(requete).id, maintenant()),
  }));

  app.post("/api/programme/offres/:id/resultat", async (requete) => {
    const c = objet(requete.body);
    let r: ResultatOffre;
    if (c.resultat === "essai") r = { resultat: "essai" };
    else if (c.resultat === "faite") r = { resultat: "faite" };
    else if (c.resultat === "erreur")
      r = { resultat: "erreur", message: texteObligatoire(c.message, "Message", 1000), releve: c.releve === true };
    else throw erreurSaisie("Résultat inconnu.");
    await enregistrerResultatOffre(base, utilisateurDe(requete).id, idDe(requete.params), r, maintenant());
    return { ok: true };
  });

  // --- Tâche « Vérification vente finalisée » (#148) ---
  app.get("/api/taches/commandes", async (requete) =>
    conforme<CommandesVintedListe>()(await listerCommandes(base, utilisateurDe(requete).id)),
  );

  app.post("/api/taches/commandes/appliquer", async (requete) => ({
    nombre: await appliquerCommandes(
      base,
      utilisateurDe(requete).id,
      idsObligatoires(objet(requete.body).ids),
      maintenant(),
    ),
  }));

  app.post("/api/taches/commandes/ecarter", async (requete) => ({
    nombre: await ecarterCommandes(
      base,
      utilisateurDe(requete).id,
      idsObligatoires(objet(requete.body).ids),
      maintenant(),
    ),
  }));

  app.post("/api/taches/commandes/:id/rattacher", async (requete) => {
    const articleId = uuidObligatoire(objet(requete.body).articleId, "Article");
    await rattacherCommande(base, utilisateurDe(requete).id, idDe(requete.params), articleId, maintenant());
    return { ok: true };
  });

  app.post("/api/taches/commandes/:id/vu", async (requete) => {
    await marquerMontantVu(base, utilisateurDe(requete).id, idDe(requete.params));
    return { ok: true };
  });

  // Extension Chrome (jeton) : commandes terminées lues sur le « Porte-monnaie ».
  app.post("/api/programme/commandes", async (requete) => {
    const c = objet(requete.body);
    if (!Array.isArray(c.commandes) || c.commandes.length > 500)
      throw erreurSaisie("Commandes : liste attendue (500 au plus).");
    const commandes: CommandeLue[] = c.commandes.map((brut: unknown, i: number) => lireCommande(brut, i));
    const erreur = c.erreur === undefined || c.erreur === null ? null : texteObligatoire(c.erreur, "Erreur", 1000);
    return recevoirCommandes(
      base,
      utilisateurDe(requete).id,
      { essai: c.essai !== false, commandes, erreur, releve: c.releve === true },
      maintenant(),
    );
  });
}

/** Filtres du journal : tâche, état, jour (AAAA-MM-JJ) ; une valeur inconnue est refusée. */
function lireFiltres(brut: unknown): FiltresJournal {
  const q = objet(brut ?? {});
  const f: FiltresJournal = {};
  if (q.tache !== undefined && q.tache !== "") {
    const tache = TACHES.find((x) => x === q.tache);
    if (!tache) throw erreurSaisie("Journal : tâche inconnue.");
    f.tache = tache;
  }
  if (q.etat !== undefined && q.etat !== "") {
    const etat = ETATS_JOURNAL.find((x) => x === q.etat);
    if (!etat) throw erreurSaisie("Journal : état inconnu.");
    f.etat = etat;
  }
  if (q.jour !== undefined && q.jour !== "") {
    if (typeof q.jour !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(q.jour))
      throw erreurSaisie("Journal : jour invalide.");
    f.jour = q.jour;
  }
  return f;
}

/** Une commande envoyée par l'extension : identifiant, annonces (numéros), date de fin, montant facultatif (centimes). */
function lireCommande(brut: unknown, i: number): CommandeLue {
  const c = objet(brut);
  const champ = `Commande ${i + 1}`;
  const idCommande = texteObligatoire(c.idCommande, `${champ} : identifiant`, 100);
  if (!Array.isArray(c.annonces) || c.annonces.length === 0 || c.annonces.length > 50)
    throw erreurSaisie(`${champ} : annonces attendues.`);
  const annonces = c.annonces.map((a: unknown) => {
    if (typeof a !== "string" || !/^\d{1,20}$/.test(a)) throw erreurSaisie(`${champ} : numéro d'annonce invalide.`);
    return a;
  });
  const dateFin = typeof c.dateFin === "string" ? new Date(c.dateFin) : new Date(Number.NaN);
  if (Number.isNaN(dateFin.getTime())) throw erreurSaisie(`${champ} : date de fin invalide.`);
  let montant: number | null = null;
  if (c.montant !== undefined && c.montant !== null) {
    if (typeof c.montant !== "number" || !Number.isInteger(c.montant) || c.montant < 0 || c.montant > 10_000_000)
      throw erreurSaisie(`${champ} : montant en centimes attendu.`);
    montant = c.montant;
  }
  return { idCommande, annonces: [...new Set(annonces)], dateFin, montant };
}

/** Un favori envoyé par l'extension : empreinte de la personne, titre de l'annonce, date du favori. */
function lireFavori(brut: unknown, i: number): FavoriLu {
  const c = objet(brut);
  const champ = `Favori ${i + 1}`;
  if (typeof c.personne !== "string" || !/^[0-9a-f]{64}$/.test(c.personne))
    throw erreurSaisie(`${champ} : empreinte de la personne attendue (jamais son pseudo).`);
  const titre = texteObligatoire(c.titre, `${champ} : titre`, 200);
  const depuis = typeof c.depuis === "string" ? new Date(c.depuis) : new Date(Number.NaN);
  if (Number.isNaN(depuis.getTime())) throw erreurSaisie(`${champ} : date invalide.`);
  return { personne: c.personne, titre, depuis };
}
