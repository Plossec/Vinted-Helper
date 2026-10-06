// Corbeille, référence jamais réutilisée, renommage et fusion des listes, liste enrichie (lot 4) — critères du §8.
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { utilisateur } from "../base/schema.js";
import { creerStockagePhotos } from "../photos/stockage.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { DUREE_CORBEILLE_MS, purgerCorbeille } from "./service.js";

describe("lot 4 — corbeille et listes", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; lieuId: string; levis: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const refs = (await base.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string; nom: string }[];
      marques: { id: string; nom: string }[];
    }>();
    t = {
      ...base,
      cookie,
      lieuId: refs.lieux.find((l) => l.nom === "Vide grenier")?.id ?? "",
      levis: refs.marques.find((m) => m.nom === "Levi's")?.id ?? "",
    };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });

  async function creer(marqueId = t.levis, prixAchat = 300) {
    const r = await requete("POST", "/api/articles", {
      nom: "Jean",
      lieuId: t.lieuId,
      prixAchat,
      dateAchat: "2026-10-01",
      categorie: "hommes/vetements/jeans/jeans-droits",
      marqueId,
      etat: "bon_etat",
    });
    return r.json<{ id: string; reference: number }>();
  }

  it("§8 — un article supprimé est restaurable et exclu de tous les calculs", async () => {
    const sortieId = randomUUID();
    await requete("POST", "/api/sorties", { id: sortieId, date: "2026-10-01", lieuId: t.lieuId, montantEssence: 200 });
    const ids = [randomUUID(), randomUUID()];
    await requete("POST", "/api/achats", {
      id: randomUUID(),
      articleIds: ids,
      sortieId,
      prixTotal: 1000,
      date: "2026-10-01",
    });
    expect((await requete("DELETE", `/api/articles/${ids[0] ?? ""}`)).statusCode).toBe(200);
    expect((await requete("GET", `/api/articles/${ids[0] ?? ""}`)).statusCode).toBe(404);
    expect((await requete("GET", "/api/articles")).json<unknown[]>()).toHaveLength(1);
    // Cas 23 : le total du lot est conservé sur l'article restant, comme l'essence.
    const restant = (await requete("GET", `/api/articles/${ids[1] ?? ""}`)).json<{
      couts: { prixAchat: number; essence: number };
    }>();
    expect(restant.couts).toMatchObject({ prixAchat: 1000, essence: 200 });
    const corbeille = (await requete("GET", "/api/corbeille")).json<{ id: string; suppressionLe: string }[]>();
    expect(corbeille.map((a) => a.id)).toEqual([ids[0]]);
    expect(corbeille[0]?.suppressionLe).toBe(
      new Date(t.horloge.maintenant().getTime() + DUREE_CORBEILLE_MS).toISOString(),
    );
    expect((await requete("POST", `/api/corbeille/${ids[0] ?? ""}/restauration`)).statusCode).toBe(200);
    expect((await requete("GET", "/api/articles")).json<unknown[]>()).toHaveLength(2);
  });

  it("§8 — l'article #0002 supprimé définitivement : un nouvel article ne reçoit jamais le numéro 2", async () => {
    await creer();
    const deux = await creer();
    await requete("DELETE", `/api/articles/${deux.id}`);
    expect((await requete("DELETE", `/api/corbeille/${deux.id}`)).statusCode).toBe(200);
    expect((await requete("GET", "/api/corbeille")).json<unknown[]>()).toEqual([]);
    expect((await creer()).reference).toBe(3);
  });

  it("§8 — lot de 4 articles partageant une photo terrain : un supprimé définitivement, la photo reste sur les 3 autres", async () => {
    const photoId = randomUUID();
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#123456" } })
      .jpeg()
      .toBuffer();
    await t.app.inject({
      method: "PUT",
      url: `/api/photos/${photoId}`,
      headers: { cookie: t.cookie, "content-type": "image/jpeg" },
      payload: image,
    });
    const sortieId = randomUUID();
    await requete("POST", "/api/sorties", { id: sortieId, date: "2026-10-01", lieuId: t.lieuId });
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await requete("POST", "/api/achats", {
      id: randomUUID(),
      articleIds: ids,
      sortieId,
      prixTotal: 1500,
      photoId,
      date: "2026-10-01",
    });
    await requete("DELETE", `/api/articles/${ids[0] ?? ""}`);
    await requete("DELETE", `/api/corbeille/${ids[0] ?? ""}`);
    for (const id of ids.slice(1)) {
      const a = (await requete("GET", `/api/articles/${id}`)).json<{ photos: { id: string }[] }>();
      expect(a.photos.map((p) => p.id)).toEqual([photoId]);
    }
    expect((await requete("GET", `/api/photos/${photoId}`)).statusCode).toBe(200);
  });

  it("purge automatique après 30 jours : article et photos propres supprimés", async () => {
    const a = await creer();
    const photoId = randomUUID();
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#654321" } })
      .jpeg()
      .toBuffer();
    await t.app.inject({
      method: "PUT",
      url: `/api/photos/${photoId}?type=annonce`,
      headers: { cookie: t.cookie, "content-type": "image/jpeg" },
      payload: image,
    });
    await requete("POST", `/api/articles/${a.id}/photos`, { photoId });
    await requete("DELETE", `/api/articles/${a.id}`);
    const stockage = creerStockagePhotos(t.dossierPhotos);
    const [u] = await t.base.select({ id: utilisateur.id }).from(utilisateur);
    const dossier = join(t.dossierPhotos, u?.id ?? "");
    expect(
      await purgerCorbeille(t.base, stockage, new Date(t.horloge.maintenant().getTime() + DUREE_CORBEILLE_MS - 1000)),
    ).toBe(0);
    expect(
      await purgerCorbeille(t.base, stockage, new Date(t.horloge.maintenant().getTime() + DUREE_CORBEILLE_MS + 1000)),
    ).toBe(1);
    expect((await requete("GET", "/api/corbeille")).json<unknown[]>()).toEqual([]);
    expect(existsSync(dossier) ? readdirSync(dossier) : []).toEqual([]);
  });

  it("§8 — fusion « Levis » + « Levi's » : tous les articles portent la marque conservée", async () => {
    const levisSansApostrophe = (await requete("POST", "/api/referentiels/marques", { nom: "Levis" })).json<{
      id: string;
    }>().id;
    const a = await creer(levisSansApostrophe);
    const b = await creer(t.levis);
    const usage = (await requete("GET", "/api/referentiels/marques")).json<{ id: string; nombreArticles: number }[]>();
    expect(usage.find((m) => m.id === levisSansApostrophe)?.nombreArticles).toBe(1);
    expect(
      (await requete("POST", `/api/referentiels/marques/${levisSansApostrophe}/fusion`, { cibleId: t.levis }))
        .statusCode,
    ).toBe(200);
    for (const id of [a.id, b.id]) {
      expect((await requete("GET", `/api/articles/${id}`)).json<{ marqueId: string }>().marqueId).toBe(t.levis);
    }
    const marques = (await requete("GET", "/api/referentiels")).json<{ marques: { nom: string }[] }>().marques;
    expect(marques.some((m) => m.nom === "Levis")).toBe(false);
  });

  it("renommer : refusé si le nom existe déjà (proposer la fusion) ; sinon appliqué", async () => {
    const levis = (await requete("POST", "/api/referentiels/marques", { nom: "Levis" })).json<{ id: string }>().id;
    const refus = await requete("PUT", `/api/referentiels/marques/${levis}`, { nom: "levi's" });
    expect(refus.statusCode).toBe(409);
    expect(refus.json<{ erreur: string }>().erreur).toMatch(/Fusionner/);
    expect((await requete("PUT", `/api/referentiels/marques/${levis}`, { nom: "Levi Strauss" })).statusCode).toBe(200);
  });

  it("fusion de lieux : articles et sorties suivent ; le lieu Maison ne peut pas être fusionné", async () => {
    const refs = (await requete("GET", "/api/referentiels")).json<{
      lieux: { id: string; nom: string; estMaison: boolean }[];
    }>();
    const lbc = refs.lieux.find((l) => l.nom === "LBC")?.id ?? "";
    const maison = refs.lieux.find((l) => l.estMaison)?.id ?? "";
    const sortieId = randomUUID();
    await requete("POST", "/api/sorties", { id: sortieId, date: "2026-10-01", lieuId: lbc });
    expect((await requete("POST", `/api/referentiels/lieux/${lbc}/fusion`, { cibleId: t.lieuId })).statusCode).toBe(
      200,
    );
    expect((await requete("GET", `/api/sorties/${sortieId}`)).json<{ lieuId: string }>().lieuId).toBe(t.lieuId);
    expect((await requete("POST", `/api/referentiels/lieux/${maison}/fusion`, { cibleId: t.lieuId })).statusCode).toBe(
      409,
    );
  });

  it("liste : champs pour filtrer, chercher et trier", async () => {
    const a = await creer();
    await requete("POST", `/api/articles/${a.id}/statut`, { vers: "en_ligne", prixAffiche: 900 });
    const [ligne] = (await requete("GET", "/api/articles")).json<Record<string, unknown>[]>();
    expect(ligne).toMatchObject({
      reference: 1,
      marque: "Levi's",
      categorie: "hommes/vetements/jeans/jeans-droits",
      lieuId: t.lieuId,
      dateAchat: "2026-10-01",
      dateMiseEnLigne: t.horloge.maintenant().toISOString(),
      dateStatut: t.horloge.maintenant().toISOString(),
    });
  });
});
