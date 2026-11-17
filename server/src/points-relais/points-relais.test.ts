// Points relais (#210) : saisie, contrôle des horaires, archivage, lien avec les ventes, cloisonnement par utilisateur.
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pointRelais, utilisateur } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { erreurHoraires } from "./horaires.js";

const FERME: never[] = [];
const SEMAINE = [
  [
    { debut: "09:00", fin: "12:00" },
    { debut: "14:00", fin: "19:00" },
  ],
  [{ debut: "09:00", fin: "19:00" }],
  [{ debut: "09:00", fin: "19:00" }],
  [{ debut: "09:00", fin: "19:00" }],
  [{ debut: "09:00", fin: "19:00" }],
  [{ debut: "09:00", fin: "12:30" }],
  FERME,
];
const POINT = { transporteur: "mondial_relay", nom: "Tabac de la gare", adresse: "1 rue des Tests", horaires: SEMAINE };

describe("horaires", () => {
  it("accepte une semaine valide, jours fermés compris", () => {
    expect(erreurHoraires(SEMAINE)).toBeNull();
    expect(erreurHoraires(Array.from({ length: 7 }, () => []))).toBeNull();
    expect(erreurHoraires([[{ debut: "00:00", fin: "24:00" }], [], [], [], [], [], []])).toBeNull();
  });

  it("refuse les semaines incomplètes, heures invalides, plages inversées ou qui se chevauchent", () => {
    expect(erreurHoraires(SEMAINE.slice(0, 6))).toMatch(/7 jours/);
    expect(erreurHoraires([[{ debut: "9h", fin: "12:00" }], [], [], [], [], [], []])).toMatch(/lundi : heure invalide/);
    expect(erreurHoraires([[], [{ debut: "12:00", fin: "09:00" }], [], [], [], [], []])).toMatch(/mardi : la fin/);
    expect(
      erreurHoraires([
        [],
        [],
        [
          { debut: "09:00", fin: "13:00" },
          { debut: "12:00", fin: "18:00" },
        ],
        [],
        [],
        [],
        [],
      ]),
    ).toMatch(/mercredi : plages dans l'ordre/);
    expect(erreurHoraires([[{ debut: "25:00", fin: "26:00" }], [], [], [], [], [], []])).toMatch(/heure invalide/);
  });
});

describe("points relais", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    t = { ...base, cookie: await seConnecter(base.app) };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });

  async function ajouter(donnees: object = POINT) {
    const r = await requete("POST", "/api/points-relais", donnees);
    expect(r.statusCode, r.body).toBe(201);
    return r.json<{ id: string; archive: boolean }>();
  }

  /** Vente d'un article en ligne ; renvoie l'identifiant de la vente. */
  async function vente() {
    const { lieux, marques } = (await requete("GET", "/api/referentiels")).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    const cree = await requete("POST", "/api/articles", {
      nom: "Jean",
      lieuId: lieux[0]?.id,
      prixAchat: 200,
      dateAchat: "2026-09-01",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      marqueId: marques[0]?.id,
      etat: "bon_etat",
    });
    const id = cree.json<{ id: string }>().id;
    await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne", prixAffiche: 900 });
    const v = await requete("POST", "/api/ventes", { articleIds: [id], montantCredite: 900 });
    expect(v.statusCode, v.body).toBe(201);
    venteArticleId = id;
    return v.json<{ id: string }>().id;
  }
  let venteArticleId = "";

  it("ajoute, liste et modifie un point ; un point archivé passe en fin de liste", async () => {
    const a = await ajouter();
    const b = await ajouter({
      ...POINT,
      transporteur: "vinted_go",
      nom: "Casier Vinted Go",
      url: "https://vintedgo.com/fr",
    });
    expect((await requete("PUT", `/api/points-relais/${a.id}`, { ...POINT, archive: true })).statusCode).toBe(200);
    const { points: liste, transporteurs } = (await requete("GET", "/api/points-relais")).json<{
      points: { id: string; archive: boolean; url: string | null }[];
      transporteurs: { code: string; libelle: string }[];
    }>();
    expect(transporteurs.map((t) => t.libelle)).toContain("Vinted Go");
    expect(liste.map((p) => p.id)).toEqual([b.id, a.id]);
    expect(liste[0]?.url).toBe("https://vintedgo.com/fr");
    expect(liste[1]?.archive).toBe(true);
  });

  it("refuse un transporteur inconnu, des horaires invalides, un lien non https", async () => {
    const refus = async (donnees: object, message: RegExp) => {
      const r = await requete("POST", "/api/points-relais", donnees);
      expect(r.statusCode).toBe(400);
      expect(r.json<{ erreur: string }>().erreur).toMatch(message);
    };
    await refus({ ...POINT, transporteur: "dhl" }, /Transporteur inconnu/);
    await refus({ ...POINT, horaires: [] }, /7 jours/);
    await refus({ ...POINT, url: "http://exemple.fr" }, /https/);
    await refus({ ...POINT, nom: "" }, /Nom/);
  });

  it("choisit le point de dépôt et le point de retrait d'une vente, puis les retire", async () => {
    const depot = await ajouter();
    const retrait = await ajouter({ ...POINT, nom: "Bureau de poste", transporteur: "la_poste" });
    const id = await vente();
    let r = await requete("PUT", `/api/ventes/${id}/points-relais`, { pointDepotId: depot.id });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ pointDepotId: depot.id, pointRetraitId: null });
    r = await requete("PUT", `/api/ventes/${id}/points-relais`, { pointRetraitId: retrait.id });
    expect(r.json()).toMatchObject({ pointDepotId: depot.id, pointRetraitId: retrait.id });
    r = await requete("PUT", `/api/ventes/${id}/points-relais`, { pointDepotId: null });
    expect(r.json()).toMatchObject({ pointDepotId: null, pointRetraitId: retrait.id });
  });

  it("la fiche de l'article donne la vente et ses points, y compris pendant un retour (À récupérer)", async () => {
    const depot = await ajouter();
    const id = await vente();
    await requete("PUT", `/api/ventes/${id}/points-relais`, { pointDepotId: depot.id });
    const lire = async () =>
      (await requete("GET", `/api/articles/${venteArticleId}`)).json<{
        statut: string;
        pointsRelais: { venteId: string; pointDepotId: string | null; pointRetraitId: string | null } | null;
      }>();
    expect((await lire()).pointsRelais).toEqual({ venteId: id, pointDepotId: depot.id, pointRetraitId: null });
    expect((await requete("POST", `/api/ventes/${id}/envoi`, {})).statusCode).toBe(200);
    const r = await requete("POST", `/api/ventes/${id}/retour`, { articleIds: [venteArticleId] });
    expect(r.statusCode, r.body).toBe(200);
    const retour = await lire();
    expect(retour.statut).toBe("a_recuperer");
    expect(retour.pointsRelais).toEqual({ venteId: id, pointDepotId: depot.id, pointRetraitId: null });
  });

  it("un point archivé ne peut plus être choisi, mais reste sur la vente qui l'avait", async () => {
    const p = await ajouter();
    const id = await vente();
    await requete("PUT", `/api/ventes/${id}/points-relais`, { pointDepotId: p.id });
    await requete("PUT", `/api/points-relais/${p.id}`, { ...POINT, archive: true });
    expect((await requete("GET", `/api/ventes/${id}`)).json()).toMatchObject({ pointDepotId: p.id });
    // Inchangé : accepté ; nouveau choix d'un point archivé : refusé.
    expect((await requete("PUT", `/api/ventes/${id}/points-relais`, { pointDepotId: p.id })).statusCode).toBe(200);
    const r = await requete("PUT", `/api/ventes/${id}/points-relais`, { pointRetraitId: p.id });
    expect(r.statusCode).toBe(400);
    expect(r.json<{ erreur: string }>().erreur).toMatch(/archivé/);
  });

  it("le point d'un autre utilisateur est introuvable", async () => {
    const [autre] = await t.base
      .insert(utilisateur)
      .values({ identifiant: "autre", motDePasseHache: "x" })
      .returning({ id: utilisateur.id });
    if (!autre) throw new Error("Utilisateur non créé.");
    const pointId = randomUUID();
    await t.base.insert(pointRelais).values({
      id: pointId,
      utilisateurId: autre.id,
      transporteur: "vinted_go",
      nom: "Point d'un autre",
      horaires: SEMAINE,
    });
    expect((await requete("PUT", `/api/points-relais/${pointId}`, POINT)).statusCode).toBe(404);
    const id = await vente();
    expect((await requete("PUT", `/api/ventes/${id}/points-relais`, { pointDepotId: pointId })).statusCode).toBe(404);
    expect((await requete("GET", "/api/points-relais")).json()).toMatchObject({ points: [] });
  });
});
