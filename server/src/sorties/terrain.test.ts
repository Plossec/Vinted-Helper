// Saisie terrain (lot 2) : sorties, « + Achat », lots, photos terrain, essence — critères du §8.
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { utilisateur } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

type Contexte = Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; lieuId: string; maisonId: string };

interface ArticleLu {
  id: string;
  reference: number;
  statut: string;
  lieuId: string;
  sortieId: string | null;
  prixAchat: number | null;
  dateAchat: string;
  couts: { prixAchat: number; essence: number };
  lot: { id: string; prixTotal: number; articles: { id: string }[] } | null;
  photos: { id: string; type: string; estPrincipale: boolean }[];
}

interface SortieLue {
  id: string;
  montantEssence: number;
  essenceFraisGeneral: number;
  articles: { id: string; prixAchat: number; essence: number; vignette: string | null }[];
}

/** Identifiant de l'utilisateur de test (dossier de ses photos). */
async function idUtilisateur(t: Awaited<ReturnType<typeof creerAppDeTest>>) {
  const [u] = await t.base.select({ id: utilisateur.id }).from(utilisateur);
  return u?.id ?? "";
}

const imageDeTest = () =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: "#0b7a75" } })
    .jpeg()
    .toBuffer();

describe("saisie terrain", () => {
  let t: Contexte;
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const refs = (await base.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string; nom: string; estMaison: boolean }[];
    }>();
    t = {
      ...base,
      cookie,
      lieuId: refs.lieux.find((l) => l.nom === "Vide grenier")?.id ?? "",
      maisonId: refs.lieux.find((l) => l.estMaison)?.id ?? "",
    };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const lireArticle = async (id: string) => (await requete("GET", `/api/articles/${id}`)).json<ArticleLu>();
  const lireSortie = async (id: string) => (await requete("GET", `/api/sorties/${id}`)).json<SortieLue>();

  async function demarrerSortie(essence?: number) {
    const id = randomUUID();
    const r = await requete("POST", "/api/sorties", {
      id,
      date: "2026-10-04",
      lieuId: t.lieuId,
      ...(essence === undefined ? {} : { montantEssence: essence }),
    });
    expect(r.statusCode).toBe(201);
    return id;
  }

  async function envoyerPhoto(type = "terrain") {
    const id = randomUUID();
    const r = await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=${type}`,
      headers: { cookie: t.cookie, "content-type": "image/jpeg" },
      payload: await imageDeTest(),
    });
    expect(r.statusCode).toBe(200);
    return id;
  }

  async function acheter(sortieId: string | null, prixTotal: number, nombre: number, photoId: string | null = null) {
    const achat = {
      id: randomUUID(),
      articleIds: Array.from({ length: nombre }, () => randomUUID()),
      sortieId,
      prixTotal,
      photoId,
      date: "2026-10-04",
    };
    const r = await requete("POST", "/api/achats", achat);
    expect(r.statusCode, r.body).toBe(201);
    return achat;
  }

  it("§8 — « + Achat », photo, prix 2, Valider → un Brouillon à 2 € rattaché à la sortie et à son lieu", async () => {
    const sortieId = await demarrerSortie();
    const photoId = await envoyerPhoto();
    const { articleIds } = await acheter(sortieId, 200, 1, photoId);
    const a = await lireArticle(articleIds[0] ?? "");
    expect(a).toMatchObject({
      statut: "brouillon",
      sortieId,
      lieuId: t.lieuId,
      prixAchat: 200,
      dateAchat: "2026-10-04",
    });
    expect(a.couts.prixAchat).toBe(200);
    expect(a.reference).toBe(1);
    expect(a.lot).toBeNull();
    expect(a.photos).toEqual([{ id: photoId, type: "terrain", ordre: 0, estPrincipale: false }]);
  });

  it("§8 — lot de 15 € pour 4 articles → 4 brouillons à 3,75 € partageant la même photo", async () => {
    const sortieId = await demarrerSortie();
    const photoId = await envoyerPhoto();
    const { articleIds, id } = await acheter(sortieId, 1500, 4, photoId);
    for (const articleId of articleIds) {
      const a = await lireArticle(articleId);
      expect(a.statut).toBe("brouillon");
      expect(a.couts.prixAchat).toBe(375);
      expect(a.prixAchat).toBeNull();
      expect(a.lot).toMatchObject({ id, prixTotal: 1500 });
      expect(a.lot?.articles).toHaveLength(4);
      expect(a.photos.map((p) => p.id)).toEqual([photoId]);
    }
    // une seule photo (+ sa vignette) pour les 4 articles
    expect(readdirSync(join(t.dossierPhotos, await idUtilisateur(t)))).toHaveLength(2);
  });

  it("§8 / cas 6 — sortie avec 4 articles et 2 € d'essence, ajout d'un 5e → 0,40 € d'essence chacun", async () => {
    const sortieId = await demarrerSortie();
    await acheter(sortieId, 400, 4);
    expect((await requete("PUT", `/api/sorties/${sortieId}/essence`, { montantEssence: 200 })).statusCode).toBe(200);
    expect((await lireSortie(sortieId)).articles.map((a) => a.essence)).toEqual([50, 50, 50, 50]);
    await acheter(sortieId, 100, 1);
    expect((await lireSortie(sortieId)).articles.map((a) => a.essence)).toEqual([40, 40, 40, 40, 40]);
  });

  it("cas 3 — total du lot corrigé à 12 € → 4,00 / 4,00 / 4,00", async () => {
    const sortieId = await demarrerSortie();
    const { id, articleIds } = await acheter(sortieId, 1000, 3);
    expect((await lireSortie(sortieId)).articles.map((a) => a.prixAchat)).toEqual([333, 333, 334]);
    expect((await requete("PUT", `/api/lots/${id}`, { prixTotal: 1200 })).statusCode).toBe(200);
    expect((await lireArticle(articleIds[0] ?? "")).couts.prixAchat).toBe(400);
  });

  it("cas 7 et 24 — sortie sans achat : essence en frais général ; après ajout, portée par l'article", async () => {
    const sortieId = await demarrerSortie(130);
    expect((await lireSortie(sortieId)).essenceFraisGeneral).toBe(130);
    await acheter(sortieId, 300, 1);
    const s = await lireSortie(sortieId);
    expect(s.essenceFraisGeneral).toBe(0);
    expect(s.articles[0]?.essence).toBe(130);
  });

  it("renvoi d'un achat ou d'une sortie (file d'attente) → aucun doublon, références inchangées", async () => {
    const sortieId = randomUUID();
    const sortie = { id: sortieId, date: "2026-10-04", lieuId: t.lieuId };
    expect((await requete("POST", "/api/sorties", sortie)).statusCode).toBe(201);
    expect((await requete("POST", "/api/sorties", sortie)).statusCode).toBe(201);
    const achat = {
      id: randomUUID(),
      articleIds: [randomUUID(), randomUUID()],
      sortieId,
      prixTotal: 500,
      date: "2026-10-04",
    };
    expect((await requete("POST", "/api/achats", achat)).statusCode).toBe(201);
    expect((await requete("POST", "/api/achats", achat)).statusCode).toBe(201);
    const liste = (await requete("GET", "/api/articles")).json<{ reference: number }[]>();
    expect(liste.map((a) => a.reference).sort()).toEqual([1, 2]);
    expect((await requete("GET", "/api/sorties")).json<unknown[]>()).toHaveLength(1);
  });

  it("annuler la sortie : articles à la corbeille (restaurables, sans sortie), sortie et essence supprimées", async () => {
    const sortieId = await demarrerSortie(450);
    const seul = await acheter(sortieId, 200, 1);
    const lot = await acheter(sortieId, 1500, 3);

    const r = await requete("DELETE", `/api/sorties/${sortieId}`);
    expect(r.statusCode, r.body).toBe(200);
    expect((await requete("GET", `/api/sorties/${sortieId}`)).statusCode).toBe(404);
    const corbeille = (await requete("GET", "/api/corbeille")).json<{ id: string }[]>().map((a) => a.id);
    expect(corbeille).toEqual(expect.arrayContaining([...seul.articleIds, ...lot.articleIds]));

    const id = seul.articleIds[0] ?? "";
    expect((await requete("POST", `/api/corbeille/${id}/restauration`)).statusCode).toBe(200);
    expect(await lireArticle(id)).toMatchObject({ sortieId: null, prixAchat: 200, couts: { essence: 0 } });

    // Renvoi par la file du téléphone : sans erreur.
    expect((await requete("DELETE", `/api/sorties/${sortieId}`)).statusCode).toBe(200);
  });

  it("article Maison : sans sortie, lieu Maison, prix 0 €, sans essence", async () => {
    const { articleIds } = await acheter(null, 999, 1);
    const a = await lireArticle(articleIds[0] ?? "");
    expect(a).toMatchObject({ sortieId: null, lieuId: t.maisonId, prixAchat: 0, couts: { prixAchat: 0, essence: 0 } });
  });

  it("lieu saisi librement : réutilise un lieu existant (sans tenir compte des majuscules) ou en crée un", async () => {
    const existant = randomUUID();
    expect(
      (await requete("POST", "/api/sorties", { id: existant, date: "2026-10-04", lieuNom: " vide GRENIER " }))
        .statusCode,
    ).toBe(201);
    expect(await lireSortie(existant)).toMatchObject({ lieuId: t.lieuId, lieu: "Vide grenier" });

    const nouveau = randomUUID();
    const r = await requete("POST", "/api/sorties", { id: nouveau, date: "2026-10-04", lieuNom: "Braderie de Lille" });
    expect(r.statusCode).toBe(201);
    const refs = (await requete("GET", "/api/referentiels")).json<{ lieux: { id: string; nom: string }[] }>();
    const cree = refs.lieux.find((l) => l.nom === "Braderie de Lille");
    expect(cree).toBeDefined();
    expect(await lireSortie(nouveau)).toMatchObject({ lieuId: cree?.id, lieu: "Braderie de Lille" });

    // Renvoi par la file du téléphone : ni doublon de sortie, ni doublon de lieu.
    await requete("POST", "/api/sorties", { id: nouveau, date: "2026-10-04", lieuNom: "Braderie de Lille" });
    const apres = (await requete("GET", "/api/referentiels")).json<{ lieux: { nom: string }[] }>();
    expect(apres.lieux.filter((l) => l.nom === "Braderie de Lille")).toHaveLength(1);

    expect(
      (await requete("POST", "/api/sorties", { id: randomUUID(), date: "2026-10-04", lieuNom: "  " })).statusCode,
    ).toBe(400);
  });

  it("modifier la date ou le lieu de la sortie met à jour ses articles", async () => {
    const sortieId = await demarrerSortie();
    const { articleIds } = await acheter(sortieId, 200, 1);
    const r = await requete("PUT", `/api/sorties/${sortieId}`, { date: "2026-10-03", lieuId: t.maisonId });
    expect(r.statusCode).toBe(200);
    expect(await lireArticle(articleIds[0] ?? "")).toMatchObject({ dateAchat: "2026-10-03", lieuId: t.maisonId });
  });

  it("refus : achat sur une sortie inconnue, sans prix, ou photo pas encore reçue", async () => {
    const sortieId = await demarrerSortie();
    const base = { id: randomUUID(), articleIds: [randomUUID()], date: "2026-10-04" };
    expect((await requete("POST", "/api/achats", { ...base, sortieId: randomUUID(), prixTotal: 100 })).statusCode).toBe(
      404,
    );
    expect((await requete("POST", "/api/achats", { ...base, sortieId })).statusCode).toBe(400);
    const r = await requete("POST", "/api/achats", { ...base, sortieId, prixTotal: 100, photoId: randomUUID() });
    expect(r.statusCode).toBe(400);
    expect(r.json<{ erreur: string }>().erreur).toContain("Photo inconnue");
  });

  it("la fiche d'un article de lot s'enregistre sans prix d'achat (part du lot conservée)", async () => {
    const sortieId = await demarrerSortie();
    const { articleIds } = await acheter(sortieId, 1000, 3);
    const marques = (await requete("GET", "/api/referentiels")).json<{ marques: { id: string }[] }>().marques;
    const r = await requete("PUT", `/api/articles/${articleIds[0] ?? ""}`, {
      nom: "Maillot",
      lieuId: t.lieuId,
      prixAchat: 5000,
      dateAchat: "2026-10-04",
      categorie: "hommes/vetements/jeans/jeans-droits",
      marqueId: marques[0]?.id,
      etat: "bon_etat",
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json<ArticleLu>()).toMatchObject({ prixAchat: null, couts: { prixAchat: 333 } });
  });
});

describe("photos", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    t = { ...base, cookie: await seConnecter(base.app) };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });

  async function envoyer(type: string, contenu?: Buffer) {
    const id = randomUUID();
    const r = await t.app.inject({
      method: "PUT",
      url: `/api/photos/${id}?type=${type}`,
      headers: { cookie: t.cookie, "content-type": "image/jpeg" },
      payload: contenu ?? (await imageDeTest()),
    });
    return { id, r };
  }

  async function articleMaison() {
    const id = randomUUID();
    await requete("POST", "/api/achats", { id, articleIds: [id], sortieId: null, date: "2026-10-04" });
    return id;
  }

  it("envoi, lecture de la photo et de sa vignette (connexion obligatoire)", async () => {
    const { id, r } = await envoyer("annonce");
    expect(r.statusCode).toBe(200);
    const photo = await requete("GET", `/api/photos/${id}`);
    expect(photo.statusCode).toBe(200);
    expect(photo.headers["content-type"]).toBe("image/jpeg");
    const vignette = await requete("GET", `/api/photos/${id}/vignette`);
    expect(vignette.headers["content-type"]).toBe("image/webp");
    expect((await sharp(vignette.rawPayload).metadata()).width).toBe(400);
    expect((await t.app.inject({ method: "GET", url: `/api/photos/${id}` })).statusCode).toBe(401);
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    const { r } = await envoyer("terrain", Buffer.from("pas une image"));
    expect(r.statusCode).toBe(400);
  });

  it("photos d'annonce : la 1re devient principale, réordonnables, principale modifiable", async () => {
    const articleId = await articleMaison();
    const p1 = (await envoyer("annonce")).id;
    const p2 = (await envoyer("annonce")).id;
    for (const photoId of [p1, p2]) {
      expect((await requete("POST", `/api/articles/${articleId}/photos`, { photoId })).statusCode).toBe(201);
    }
    let photos = (await requete("GET", `/api/articles/${articleId}`)).json<ArticleLu>().photos;
    expect(photos.map((p) => [p.id, p.estPrincipale])).toEqual([
      [p1, true],
      [p2, false],
    ]);
    await requete("PUT", `/api/articles/${articleId}/photos`, { ordre: [p2, p1], principale: p2 });
    photos = (await requete("GET", `/api/articles/${articleId}`)).json<ArticleLu>().photos;
    expect(photos.map((p) => [p.id, p.estPrincipale])).toEqual([
      [p2, true],
      [p1, false],
    ]);
    const liste = (await requete("GET", "/api/articles")).json<{ vignette: string }[]>();
    expect(liste[0]?.vignette).toBe(p2);
  });

  it("retirer la photo principale : la suivante devient principale et le fichier est effacé", async () => {
    const articleId = await articleMaison();
    const p1 = (await envoyer("annonce")).id;
    const p2 = (await envoyer("annonce")).id;
    for (const photoId of [p1, p2]) await requete("POST", `/api/articles/${articleId}/photos`, { photoId });
    const moi = await idUtilisateur(t);
    expect((await requete("DELETE", `/api/articles/${articleId}/photos/${p1}`)).statusCode).toBe(200);
    const photos = (await requete("GET", `/api/articles/${articleId}`)).json<ArticleLu>().photos;
    expect(photos.map((p) => [p.id, p.estPrincipale])).toEqual([[p2, true]]);
    expect(existsSync(join(t.dossierPhotos, moi, `${p1}.jpg`))).toBe(false);
    expect((await requete("GET", `/api/photos/${p1}`)).statusCode).toBe(404);
  });

  it("§8 — photo terrain partagée : retirée d'un article, elle reste visible sur les autres", async () => {
    const photoId = (await envoyer("terrain")).id;
    const sortieId = randomUUID();
    const refs = (await requete("GET", "/api/referentiels")).json<{ lieux: { id: string }[] }>();
    await requete("POST", "/api/sorties", { id: sortieId, date: "2026-10-04", lieuId: refs.lieux[0]?.id });
    const articleIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await requete("POST", "/api/achats", {
      id: randomUUID(),
      articleIds,
      sortieId,
      prixTotal: 1500,
      photoId,
      date: "2026-10-04",
    });
    await requete("DELETE", `/api/articles/${articleIds[0] ?? ""}/photos/${photoId}`);
    for (const id of articleIds.slice(1)) {
      expect((await requete("GET", `/api/articles/${id}`)).json<ArticleLu>().photos.map((p) => p.id)).toEqual([
        photoId,
      ]);
    }
    expect((await requete("GET", `/api/photos/${photoId}`)).statusCode).toBe(200);
  });
});
