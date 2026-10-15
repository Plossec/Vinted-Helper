// Écran « À faire » (#191) : « Vu » des alertes « Pour info » et vente des articles à expédier ; articles À publier
// incomplets (#196).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { article } from "../base/schema.js";
import { completerAnnonce, creerAppDeTest, seConnecter } from "../test/outils.js";

interface AlerteLue {
  id: string;
  depuis: string;
  venteId?: string | null;
}
interface AlertesLues {
  brouillons: AlerteLue[];
  dormants: AlerteLue[];
  aExpedier: AlerteLue[];
  incomplets: (AlerteLue & { manques: string[] })[];
}

const JOUR_MS = 86_400_000;

describe("alertes de l'écran À faire", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; lieuId: string; marqueId: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const refs = (await base.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    t = { ...base, cookie, lieuId: refs.lieux[0]?.id ?? "", marqueId: refs.marques[0]?.id ?? "" };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const alertes = async () => (await requete("GET", "/api/alertes")).json<AlertesLues>();

  async function creer() {
    const r = await requete("POST", "/api/articles", {
      nom: "Article",
      lieuId: t.lieuId,
      prixAchat: 200,
      dateAchat: "2026-09-01",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      marqueId: t.marqueId,
      etat: "bon_etat",
    });
    expect(r.statusCode, r.body).toBe(201);
    return r.json<{ id: string }>().id;
  }

  it("« Vu » masque un article dormant ; les autres restent", async () => {
    const a = await creer();
    const b = await creer();
    for (const id of [a, b])
      await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne", prixAffiche: 900 });
    t.horloge.avancer(8 * JOUR_MS);
    const avant = await alertes();
    expect(avant.dormants.map((x) => x.id).sort()).toEqual([a, b].sort());
    const depuis = avant.dormants.find((x) => x.id === a)?.depuis;
    const vu = await requete("POST", "/api/alertes/vu", { type: "dormants", articleId: a, depuis });
    expect(vu.statusCode, vu.body).toBe(200);
    expect((await alertes()).dormants.map((x) => x.id)).toEqual([b]);
    // Deuxième « Vu » du même article : remplace le premier, sans erreur.
    expect((await requete("POST", "/api/alertes/vu", { type: "dormants", articleId: a, depuis })).statusCode).toBe(200);
  });

  it("refuse un « Vu » sur une chose à faire, une date invalide ou un article inconnu", async () => {
    const a = await creer();
    const depuis = "2026-10-05";
    expect((await requete("POST", "/api/alertes/vu", { type: "aExpedier", articleId: a, depuis })).statusCode).toBe(
      400,
    );
    expect(
      (await requete("POST", "/api/alertes/vu", { type: "dormants", articleId: a, depuis: "hier" })).statusCode,
    ).toBe(400);
    const inconnu = "00000000-0000-4000-8000-0000000000ff";
    expect(
      (await requete("POST", "/api/alertes/vu", { type: "dormants", articleId: inconnu, depuis })).statusCode,
    ).toBe(404);
  });

  it("donne la vente de chaque article à expédier (bouton « Envoyé »)", async () => {
    const a = await creer();
    await requete("POST", `/api/articles/${a}/statut`, { vers: "en_ligne", prixAffiche: 900 });
    const v = await requete("POST", "/api/ventes", { articleIds: [a], montantCredite: 900 });
    expect(v.statusCode, v.body).toBe(201);
    const venteId = v.json<{ id: string }>().id;
    expect((await alertes()).aExpedier).toMatchObject([{ id: a, venteId }]);
  });

  it("signale les articles À publier devenus incomplets, avec ce qui leur manque (#196)", async () => {
    const complet = await creer();
    const vide = await creer();
    const autre = await creer();
    for (const id of [complet, vide, autre]) {
      await completerAnnonce(t.base, id);
      expect((await requete("POST", `/api/articles/${id}/statut`, { vers: "a_publier" })).statusCode).toBe(200);
    }
    await t.base.update(article).set({ couleurs: [], titreAnnonce: " " }).where(eq(article.id, vide));
    await t.base.update(article).set({ categorie: "autre" }).where(eq(article.id, autre));
    expect((await alertes()).incomplets).toMatchObject([
      { id: vide, depuis: "2026-10-05", manques: ["titre de l'annonce", "couleur"] },
    ]);
  });
});
