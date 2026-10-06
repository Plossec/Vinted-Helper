// Construction de l'application web (routes de l'API + interface compilée).
import { existsSync } from "node:fs";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyRequest } from "fastify";
import { routesArticles } from "./articles/routes.js";
import { routesCorbeille } from "./corbeille/routes.js";
import type { Base } from "./base/connexion.js";
import { poserCookie, routesCompte } from "./compte/routes.js";
import { lireSession, NOM_COOKIE, type UtilisateurConnecte } from "./compte/sessions.js";
import { ErreurMetier, nonConnecte } from "./outils/erreurs.js";
import { routesPhotos } from "./photos/routes.js";
import { creerStockagePhotos } from "./photos/stockage.js";
import { routesReferentiels } from "./referentiels/routes.js";
import { routesSorties } from "./sorties/routes.js";
import { routesTableau } from "./tableau/routes.js";
import { routesVentes } from "./ventes/routes.js";

export interface DependancesApp {
  version: string;
  base: Base;
  /** Vérifie que la base de données répond. */
  verifierBase: () => Promise<boolean>;
  /** Horloge (remplaçable dans les tests). */
  maintenant?: () => Date;
  /** Dossier des photos (data/photos). */
  dossierPhotos: string;
  /** Dossier de l'interface compilée ; absent en développement (Vite sert l'interface). */
  dossierClient?: string;
  journaliser?: boolean;
}

export interface ReponseSante {
  application: "Vinted Helper";
  version: string;
  base: "connectée" | "indisponible";
}

/** Ce que reçoivent les modules de routes. */
export interface ContexteRoutes {
  base: Base;
  maintenant: () => Date;
  /** Utilisateur connecté de la requête (erreur 401 sinon). */
  utilisateurDe: (requete: FastifyRequest) => UtilisateurConnecte;
}

/** Adresses de l'API accessibles sans être connecté. */
const ROUTES_PUBLIQUES = new Set(["/api/sante", "/api/connexion", "/api/deconnexion"]);

export async function creerApp({
  version,
  base,
  verifierBase,
  maintenant = () => new Date(),
  dossierPhotos,
  dossierClient,
  journaliser = false,
}: DependancesApp) {
  // trustProxy : derrière le relais HTTPS (Caddy), le protocole d'origine sert au cookie « secure ».
  const app = Fastify({ logger: journaliser, trustProxy: true });
  await app.register(fastifyCookie);

  const utilisateurs = new WeakMap<FastifyRequest, UtilisateurConnecte>();
  const utilisateurDe = (requete: FastifyRequest) => {
    const utilisateur = utilisateurs.get(requete);
    if (!utilisateur) throw nonConnecte();
    return utilisateur;
  };

  // Contrôle de connexion pour toute l'API (sauf les routes publiques).
  app.addHook("onRequest", async (requete, reponse) => {
    const chemin = requete.url.split("?")[0] ?? "";
    if (!chemin.startsWith("/api/")) return;
    const jeton = requete.cookies[NOM_COOKIE];
    const utilisateur = jeton ? await lireSession(base, jeton, maintenant()) : null;
    if (utilisateur && jeton) {
      utilisateurs.set(requete, utilisateur);
      poserCookie(requete, reponse, jeton); // prolonge la durée du cookie à chaque usage
    } else if (!ROUTES_PUBLIQUES.has(chemin)) {
      throw nonConnecte();
    }
  });

  // Erreurs : messages en français, jamais de détail technique pour l'utilisateur.
  app.setErrorHandler((erreur, requete, reponse) => {
    if (erreur instanceof ErreurMetier) {
      return reponse.code(erreur.statut).send({ erreur: erreur.message });
    }
    const statut = typeof erreur === "object" && erreur !== null && "statusCode" in erreur ? erreur.statusCode : 500;
    if (typeof statut === "number" && statut >= 400 && statut < 500) {
      return reponse.code(statut).send({ erreur: "Requête invalide." });
    }
    requete.log.error(erreur);
    return reponse
      .code(500)
      .send({ erreur: "Erreur interne du serveur. Réessayez ; si le problème continue, consultez les journaux." });
  });

  app.get("/api/sante", async (): Promise<ReponseSante> => {
    const baseOk = await verifierBase();
    return { application: "Vinted Helper", version, base: baseOk ? "connectée" : "indisponible" };
  });

  const contexte: ContexteRoutes = { base, maintenant, utilisateurDe };
  routesCompte(app, contexte);
  routesReferentiels(app, contexte);
  routesArticles(app, contexte);
  routesSorties(app, contexte);
  routesVentes(app, contexte);
  routesTableau(app, contexte);
  const stockage = creerStockagePhotos(dossierPhotos);
  routesPhotos(app, contexte, stockage);
  routesCorbeille(app, contexte, stockage);

  if (dossierClient !== undefined && existsSync(dossierClient)) {
    await app.register(fastifyStatic, { root: dossierClient });
    // Application d'une seule page : toute adresse inconnue hors /api renvoie l'interface.
    app.setNotFoundHandler((requete, reponse) => {
      if (requete.url.startsWith("/api/")) {
        return reponse.code(404).send({ erreur: "Adresse inconnue" });
      }
      return reponse.sendFile("index.html");
    });
  }

  return app;
}
