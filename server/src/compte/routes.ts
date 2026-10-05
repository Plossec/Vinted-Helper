// Routes du compte : connexion, déconnexion, compte connecté, changement du mot de passe.
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ContexteRoutes } from "../app.js";
import { utilisateur } from "../base/schema.js";
import { ErreurMetier, erreurSaisie } from "../outils/erreurs.js";
import { objet } from "../outils/validation.js";
import { creerLimiteur } from "./limiteur.js";
import { hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE, verifierMotDePasse } from "./mot-de-passe.js";
import {
  creerSession,
  DUREE_SESSION_MS,
  NOM_COOKIE,
  supprimerSession,
  supprimerSessionsUtilisateur,
} from "./sessions.js";

const MESSAGE_REFUS = "Identifiant ou mot de passe incorrect.";

export function optionsCookie(requete: FastifyRequest) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: requete.protocol === "https",
    maxAge: DUREE_SESSION_MS / 1000,
  };
}

export function poserCookie(requete: FastifyRequest, reponse: FastifyReply, jeton: string) {
  void reponse.setCookie(NOM_COOKIE, jeton, optionsCookie(requete));
}

function texteBrut(valeur: unknown, champ: string): string {
  if (typeof valeur !== "string" || valeur === "") throw erreurSaisie(`${champ} : obligatoire.`);
  return valeur;
}

export function routesCompte(app: FastifyInstance, { base, maintenant, utilisateurDe }: ContexteRoutes) {
  const limiteur = creerLimiteur();

  app.post("/api/connexion", async (requete, reponse) => {
    const corps = objet(requete.body);
    const identifiant = texteBrut(corps.identifiant, "Identifiant").trim();
    const motDePasse = texteBrut(corps.motDePasse, "Mot de passe");
    const instant = maintenant().getTime();
    const cle = requete.ip;
    if (limiteur.estBloque(cle, instant)) {
      throw new ErreurMetier(429, "Trop de tentatives. Réessayez dans 15 minutes.");
    }
    const [compte] = await base.select().from(utilisateur).where(eq(utilisateur.identifiant, identifiant));
    if (!compte || !(await verifierMotDePasse(motDePasse, compte.motDePasseHache))) {
      limiteur.noterEchec(cle, instant);
      throw new ErreurMetier(401, MESSAGE_REFUS);
    }
    limiteur.effacer(cle);
    poserCookie(requete, reponse, await creerSession(base, compte.id, maintenant()));
    return { identifiant: compte.identifiant };
  });

  app.post("/api/deconnexion", async (requete, reponse) => {
    const jeton = requete.cookies[NOM_COOKIE];
    if (jeton) await supprimerSession(base, jeton);
    void reponse.clearCookie(NOM_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/moi", async (requete) => ({ identifiant: utilisateurDe(requete).identifiant }));

  app.put("/api/moi/mot-de-passe", async (requete) => {
    const moi = utilisateurDe(requete);
    const corps = objet(requete.body);
    const ancien = texteBrut(corps.ancien, "Mot de passe actuel");
    const nouveau = texteBrut(corps.nouveau, "Nouveau mot de passe");
    if (nouveau.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      throw erreurSaisie(`Le nouveau mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
    }
    const [compte] = await base.select().from(utilisateur).where(eq(utilisateur.id, moi.id));
    if (!compte || !(await verifierMotDePasse(ancien, compte.motDePasseHache))) {
      throw erreurSaisie("Le mot de passe actuel est incorrect.");
    }
    await base
      .update(utilisateur)
      .set({ motDePasseHache: await hacherMotDePasse(nouveau) })
      .where(eq(utilisateur.id, moi.id));
    // Les autres appareils connectés sont déconnectés ; la session en cours est conservée.
    await supprimerSessionsUtilisateur(base, moi.id, requete.cookies[NOM_COOKIE]);
    return { ok: true };
  });
}
