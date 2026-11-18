// Articles créés à partir de photos (#276, ADR-0117). Gemini n'est JAMAIS appelé réellement : réponses simulées.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { article, historiquePrix } from "../base/schema.js";
import { creerStockagePhotos } from "../photos/stockage.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { analyserEnAttente, ESSAIS_MAX, groupesValides } from "./articles-par-photos.js";
import { iaIndisponible } from "./gemini.js";

describe("groupes proposés par l'IA", () => {
  it("chaque photo dans un seul groupe ; doublons, numéros hors limites et oubliés corrigés", () => {
    expect(groupesValides({ groupes: [[0, 1], [2]] }, 3)).toEqual([[0, 1], [2]]);
    expect(groupesValides({ groupes: [[0, 1, 1], [1, 7, -1], [2]] }, 4)).toEqual([[0, 1], [2], [3]]);
    expect(groupesValides({ autre: true }, 2)).toEqual([[0], [1]]);
    expect(groupesValides(null, 1)).toEqual([[0]]);
  });
});

describe("articles créés par photos", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;
  let lieuId: string;
  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
    const refs = (await t.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
    }>();
    lieuId = refs.lieux[0]?.id ?? "";
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

  async function envoyerPhotos(nombre: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < nombre; i++) {
      const id = randomUUID();
      const image = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#336699" } })
        .jpeg()
        .toBuffer();
      const r = await t.app.inject({
        method: "PUT",
        url: `/api/photos/${id}?type=annonce`,
        headers: { cookie, "content-type": "image/jpeg" },
        payload: image,
      });
      expect(r.statusCode, r.body).toBe(200);
      ids.push(id);
    }
    return ids;
  }
  const analyser = (reserver: (u: string) => boolean = () => true) =>
    analyserEnAttente(t.base, creerStockagePhotos(t.dossierPhotos), t.ia.client, reserver, t.horloge.maintenant);
  const lire = async (id: string) => (await requete("GET", `/api/articles/${id}`)).json<Record<string, unknown>>();

  it("regroupement : un appel à l'IA avec toutes les photos ; photo oubliée → article à elle seule", async () => {
    const photos = await envoyerPhotos(4);
    t.ia.repondre('{"groupes": [[0, 2], [1]]}');
    const r = await requete("POST", "/api/articles-par-photos/regroupement", { photoIds: photos });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toEqual({ groupes: [[photos[0], photos[2]], [photos[1]], [photos[3]]] });
    expect(t.ia.appels).toHaveLength(1);
    expect(t.ia.appels[0]?.images).toBe(4);
    // Photo inconnue ou en double : refus.
    expect(
      (await requete("POST", "/api/articles-par-photos/regroupement", { photoIds: [randomUUID()] })).statusCode,
    ).toBe(400);
    expect(
      (await requete("POST", "/api/articles-par-photos/regroupement", { photoIds: [photos[0], photos[0]] })).statusCode,
    ).toBe(400);
  });

  it("création : un brouillon par groupe, photos d'annonce, prix total en lot, puis remplissage par l'IA", async () => {
    const photos = await envoyerPhotos(3);
    const r = await requete("POST", "/api/articles-par-photos", {
      groupes: [[photos[0], photos[1]], [photos[2]]],
      lieuId,
      date: "2026-10-04",
      prixTotal: 500,
    });
    expect(r.statusCode, r.body).toBe(201);
    const [a, b] = r.json<{ articleIds: string[] }>().articleIds;
    expect(await lire(a ?? "")).toMatchObject({
      statut: "brouillon",
      lieuId,
      dateAchat: "2026-10-04",
      lot: { prixTotal: 500 },
      couts: { prixAchat: 250 },
      photos: [{ id: photos[0], estPrincipale: true }, { id: photos[1] }],
    });
    // À faire : à compléter, avec l'analyse en attente.
    const avant = (await requete("GET", "/api/alertes")).json<{
      aCompleter: { id: string; manques: string[] }[];
      brouillons: { id: string }[];
    }>();
    expect(avant.aCompleter.map((x) => x.id).sort()).toEqual([a, b].sort());
    expect(avant.aCompleter[0]?.manques).toContain("analyse par l'IA (en attente)");

    t.ia.repondre(
      JSON.stringify({
        nom: "Jean Levi's 501",
        categorie: "jean coupe droite homme",
        marque: "Levi's",
        etat: "Très bon état",
        couleurs: ["Bleu", "Noir", "Rouge"],
        taille: "W32 L32",
        matiere: "100 % coton",
        titre: "Jean Levi's 501 bleu W32",
        description: "Beau jean.\n#levis",
        prix: 14.9,
      }),
    );
    expect(await analyser()).toBe(2);
    expect(t.ia.appels.at(-1)?.images).toBe(1);
    const fiche = await lire(a ?? "");
    expect(fiche).toMatchObject({
      nom: "Jean Levi's 501",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      etat: "tres_bon_etat",
      couleurs: ["bleu", "noir"],
      taille: "W32 L32",
      matiere: "100 % coton",
      titreAnnonce: "Jean Levi's 501 bleu W32",
      prixAffiche: 1500,
    });
    expect(String(fiche.descriptionAnnonce)).toMatch(/Réf\. \d+$/);
    const marques = (await requete("GET", "/api/referentiels")).json<{ marques: { id: string; nom: string }[] }>()
      .marques;
    expect(marques.find((m) => m.id === fiche.marqueId)?.nom).toBe("Levi's");
    const prix = await t.base
      .select()
      .from(historiquePrix)
      .where(eq(historiquePrix.articleId, a ?? ""));
    expect(prix.map((p) => p.prix)).toEqual([1500]);
    // Complet : plus rien à compléter.
    const apres = (await requete("GET", "/api/alertes")).json<{ aCompleter: unknown[] }>();
    expect(apres.aCompleter).toEqual([]);
  });

  it("sans prix d'achat : à compléter article par article ; l'IA ne remplace jamais une saisie", async () => {
    const photos = await envoyerPhotos(1);
    const r = await requete("POST", "/api/articles-par-photos", {
      groupes: [photos],
      lieuId,
      date: "2026-10-04",
    });
    const [a] = r.json<{ articleIds: string[] }>().articleIds;
    await t.base
      .update(article)
      .set({ nom: "Nom saisi", prixAffiche: 900 })
      .where(eq(article.id, a ?? ""));
    t.ia.repondre('{"nom": "Autre nom", "prix": 30}');
    await analyser();
    expect(await lire(a ?? "")).toMatchObject({ nom: "Nom saisi", prixAffiche: 900, prixAchat: null });
    const alertes = (await requete("GET", "/api/alertes")).json<{ aCompleter: { manques: string[] }[] }>();
    expect(alertes.aCompleter[0]?.manques).toEqual(expect.arrayContaining(["prix d'achat", "marque", "état"]));
  });

  it("au-delà de la limite d'appels : l'article attend ; 3 erreurs de l'IA → à remplir à la main", async () => {
    const photos = await envoyerPhotos(2);
    const r = await requete("POST", "/api/articles-par-photos", {
      groupes: [[photos[0]], [photos[1]]],
      lieuId,
      date: "2026-10-04",
    });
    const ids = r.json<{ articleIds: string[] }>().articleIds;
    expect(await analyser(() => false)).toBe(0);
    expect(t.ia.appels).toHaveLength(0);
    t.ia.repondre(iaIndisponible("Gemini est surchargé."));
    for (let i = 0; i < ESSAIS_MAX; i++) await analyser();
    const etats = await t.base.select({ analyseIa: article.analyseIa }).from(article);
    expect(etats.map((e) => e.analyseIa)).toEqual(["echec", "echec"]);
    const alertes = (await requete("GET", "/api/alertes")).json<{ aCompleter: { id: string; manques: string[] }[] }>();
    expect(alertes.aCompleter.map((x) => x.id).sort()).toEqual([...ids].sort());
    expect(alertes.aCompleter[0]?.manques[0]).toBe("analyse par l'IA impossible : à remplir à la main");
  });

  it("refus : groupe vide, photo dans deux articles, sans lieu ni sortie", async () => {
    const photos = await envoyerPhotos(1);
    const base = { lieuId, date: "2026-10-04" };
    expect((await requete("POST", "/api/articles-par-photos", { ...base, groupes: [[]] })).statusCode).toBe(400);
    expect((await requete("POST", "/api/articles-par-photos", { ...base, groupes: [photos, photos] })).statusCode).toBe(
      400,
    );
    expect(
      (await requete("POST", "/api/articles-par-photos", { groupes: [photos], date: "2026-10-04" })).statusCode,
    ).toBe(400);
  });
});
