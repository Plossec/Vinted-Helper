// Compte, connexion et sessions — cahier des charges §2.1 et critère « Compte » du §8.
import { count } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { amorcerCompte, VALEURS_INITIALES } from "../base/amorcage.js";
import { lieu, marque, utilisateur } from "../base/schema.js";
import { creerAppDeTest, IDENTIFIANT_TEST, MOT_DE_PASSE_TEST, seConnecter } from "../test/outils.js";
import { hacherMotDePasse, verifierMotDePasse } from "./mot-de-passe.js";
import { DUREE_SESSION_MS } from "./sessions.js";

describe("mot de passe (scrypt)", () => {
  it("le bon mot de passe est accepté, un mauvais est refusé", async () => {
    const hache = await hacherMotDePasse("un-secret-solide");
    expect(hache).not.toContain("un-secret-solide");
    expect(await verifierMotDePasse("un-secret-solide", hache)).toBe(true);
    expect(await verifierMotDePasse("un-autre-secret", hache)).toBe(false);
  });

  it("deux hachages du même mot de passe sont différents (sel aléatoire)", async () => {
    expect(await hacherMotDePasse("identique")).not.toBe(await hacherMotDePasse("identique"));
  });
});

describe("compte et connexion", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  beforeEach(async () => {
    t = await creerAppDeTest();
  });
  afterEach(() => t.fermer());

  it("le compte est créé au premier démarrage avec les listes pré-remplies, une seule fois", async () => {
    const [comptes] = await t.base.select({ n: count() }).from(utilisateur);
    expect(comptes?.n).toBe(1);
    const [lieux] = await t.base.select({ n: count() }).from(lieu);
    expect(lieux?.n).toBe(VALEURS_INITIALES.lieux.length);
    const [marques] = await t.base.select({ n: count() }).from(marque);
    expect(marques?.n).toBe(VALEURS_INITIALES.marques.length);
    expect(VALEURS_INITIALES.marques[0]).toBe("Sans marque");
    // Second démarrage : rien n'est recréé.
    expect(await amorcerCompte(t.base, () => ({ identifiant: "autre", motDePasse: "autre-mdp" }))).toBe(false);
  });

  it("il n'existe aucune page d'inscription", async () => {
    const reponse = await t.app.inject({ method: "POST", url: "/api/inscription", payload: {} });
    expect(reponse.statusCode).not.toBe(200);
    expect(reponse.statusCode).not.toBe(201);
  });

  it("l'API refuse l'accès sans connexion", async () => {
    const reponse = await t.app.inject({ method: "GET", url: "/api/articles" });
    expect(reponse.statusCode).toBe(401);
    expect(reponse.json()).toEqual({ erreur: "Vous n'êtes pas connecté." });
  });

  it("connexion avec le bon mot de passe, refus avec un mauvais", async () => {
    const refus = await t.app.inject({
      method: "POST",
      url: "/api/connexion",
      payload: { identifiant: IDENTIFIANT_TEST, motDePasse: "faux" },
    });
    expect(refus.statusCode).toBe(401);
    expect(refus.json()).toEqual({ erreur: "Identifiant ou mot de passe incorrect." });

    const cookie = await seConnecter(t.app);
    const moi = await t.app.inject({ method: "GET", url: "/api/moi", headers: { cookie } });
    expect(moi.json()).toEqual({ identifiant: IDENTIFIANT_TEST });
  });

  it("après 5 échecs, la connexion est bloquée 15 minutes", async () => {
    const essai = (motDePasse: string) =>
      t.app.inject({ method: "POST", url: "/api/connexion", payload: { identifiant: IDENTIFIANT_TEST, motDePasse } });
    for (let i = 0; i < 5; i++) expect((await essai("faux")).statusCode).toBe(401);
    expect((await essai(MOT_DE_PASSE_TEST)).statusCode).toBe(429);
    t.horloge.avancer(15 * 60 * 1000 + 1);
    expect((await essai(MOT_DE_PASSE_TEST)).statusCode).toBe(200);
  });

  it("la déconnexion ferme la session", async () => {
    const cookie = await seConnecter(t.app);
    await t.app.inject({ method: "POST", url: "/api/deconnexion", headers: { cookie } });
    const moi = await t.app.inject({ method: "GET", url: "/api/moi", headers: { cookie } });
    expect(moi.statusCode).toBe(401);
  });

  it("session : 30 jours sans utilisation, prolongée à chaque usage", async () => {
    const cookie = await seConnecter(t.app);
    const moi = () => t.app.inject({ method: "GET", url: "/api/moi", headers: { cookie } });
    t.horloge.avancer(DUREE_SESSION_MS - 60_000); // 29 jours et 23 h 59 : encore valide, et prolongée
    expect((await moi()).statusCode).toBe(200);
    t.horloge.avancer(DUREE_SESSION_MS - 60_000); // encore presque 30 jours : valide grâce à la prolongation
    expect((await moi()).statusCode).toBe(200);
    t.horloge.avancer(DUREE_SESSION_MS + 1); // plus de 30 jours sans utilisation : expirée
    expect((await moi()).statusCode).toBe(401);
  });

  it("le mot de passe est modifiable dans les Réglages (ancien mot de passe exigé)", async () => {
    const cookie = await seConnecter(t.app);
    const changer = (ancien: string, nouveau: string) =>
      t.app.inject({ method: "PUT", url: "/api/moi/mot-de-passe", headers: { cookie }, payload: { ancien, nouveau } });

    expect((await changer("faux", "nouveau-mot-de-passe")).json()).toEqual({
      erreur: "Le mot de passe actuel est incorrect.",
    });
    expect((await changer(MOT_DE_PASSE_TEST, "court")).statusCode).toBe(400);
    expect((await changer(MOT_DE_PASSE_TEST, "nouveau-mot-de-passe")).statusCode).toBe(200);

    // La session en cours reste ouverte ; l'ancien mot de passe ne marche plus, le nouveau oui.
    expect((await t.app.inject({ method: "GET", url: "/api/moi", headers: { cookie } })).statusCode).toBe(200);
    await expect(seConnecter(t.app)).rejects.toThrow(/401/);
    await expect(seConnecter(t.app, "nouveau-mot-de-passe")).resolves.toContain("vh_session=");
  });
});
