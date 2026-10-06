// IA (lot 6) — critères du §8. Gemini n'est JAMAIS appelé réellement : réponses simulées.
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { creerClientGemini, iaIndisponible } from "./gemini.js";
import { finaliserAnnonce, trouverCategorie } from "./service.js";

describe("finaliserAnnonce", () => {
  it("§8 — la description se termine par « Réf. 127 » (une seule fois)", () => {
    const { description } = finaliserAnnonce("Jean", "Super jean.\n#jean\nRéf. 12\n", 127);
    expect(description).toBe("Super jean.\n#jean\n\nRéf. 127");
  });

  it("titre limité à 60 caractères, coupé à un mot", () => {
    const long = "Jean Levi's 501 noir taille W32 L32 très bon état coupe droite vintage";
    const { titre } = finaliserAnnonce(long, "x", 1);
    expect(titre.length).toBeLessThanOrEqual(60);
    expect(long.startsWith(titre)).toBe(true);
    expect(long[titre.length]).toBe(" ");
  });
});

describe("trouverCategorie", () => {
  it("rapproche un texte libre de l'arbre des catégories", () => {
    expect(trouverCategorie("jean slim homme")).toBe("hommes/vetements/jeans/jeans-slim");
    expect(trouverCategorie("")).toBeNull();
    expect(trouverCategorie("zzz")).toBeNull();
  });
});

describe("client Gemini (requête simulée)", () => {
  const reponse = (statut: number, corps: unknown = {}) =>
    (async () => new Response(JSON.stringify(corps), { status: statut })) as unknown as typeof fetch;

  it("clé ou modèle absents → message clair, sans appel", async () => {
    let appels = 0;
    const compter = (async () => {
      appels++;
      return new Response("{}");
    }) as unknown as typeof fetch;
    await expect(creerClientGemini("votre-cle-gemini", "m", compter).generer("p", [])).rejects.toThrow(/Clé Gemini/);
    await expect(creerClientGemini("cle", "", compter).generer("p", [])).rejects.toThrow(/Modèle Gemini/);
    expect(appels).toBe(0);
  });

  it("quota, modèle inconnu, réseau → erreurs 503 en français", async () => {
    await expect(creerClientGemini("cle", "m", reponse(429)).generer("p", [])).rejects.toThrow(/Quota/);
    await expect(creerClientGemini("cle", "m", reponse(404)).generer("p", [])).rejects.toThrow(/introuvable/);
    const panne = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(creerClientGemini("cle", "m", panne).generer("p", [])).rejects.toMatchObject({ statut: 503 });
  });

  it("lit le texte de la réponse et envoie la clé dans l'en-tête (jamais dans l'adresse)", async () => {
    let url = "";
    let entetes: HeadersInit | undefined;
    const ok = (async (u: string, init: RequestInit) => {
      url = u;
      entetes = init.headers;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] }));
    }) as unknown as typeof fetch;
    expect(await creerClientGemini("secret", "gemini-test", ok).generer("p", [])).toBe('{"a":1}');
    expect(url).not.toContain("secret");
    expect(entetes).toMatchObject({ "x-goog-api-key": "secret" });
  });
});

describe("IA par l'API", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; articleId: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const refs = (await base.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
      marques: { id: string; nom: string }[];
    }>();
    const a = await base.app.inject({
      method: "POST",
      url: "/api/articles",
      headers: { cookie },
      payload: {
        nom: "Jean 501",
        lieuId: refs.lieux[0]?.id,
        prixAchat: 300,
        dateAchat: "2026-10-01",
        categorie: "hommes/vetements/jeans/jeans-droits",
        marqueId: refs.marques.find((m) => m.nom === "Levi's")?.id,
        etat: "bon_etat",
        taille: "W32",
      },
    });
    t = { ...base, cookie, articleId: a.json<{ id: string }>().id };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });

  it("§8 — génération : titre et description enregistrés, terminés par « Réf. 1 », modifiables ensuite", async () => {
    const image = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: "#336699" } })
      .jpeg()
      .toBuffer();
    const photoId = randomUUID();
    await t.app.inject({
      method: "PUT",
      url: `/api/photos/${photoId}?type=annonce`,
      headers: { cookie: t.cookie, "content-type": "image/jpeg" },
      payload: image,
    });
    await requete("POST", `/api/articles/${t.articleId}/photos`, { photoId });
    t.ia.repondre('```json\n{"titre": "Jean Levi\'s 501 W32", "description": "Beau jean.\\n#levis"}\n```');
    const r = await requete("POST", `/api/articles/${t.articleId}/annonce/generation`);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({
      titreAnnonce: "Jean Levi's 501 W32",
      descriptionAnnonce: "Beau jean.\n#levis\n\nRéf. 1",
    });
    expect(t.ia.appels[0]?.images).toBe(1);
    expect(t.ia.appels[0]?.prompt).toContain("Levi's");
    expect(t.ia.appels[0]?.prompt).toContain("Hommes › Vêtements › Jeans");
    const modif = await requete("PUT", `/api/articles/${t.articleId}/annonce`, {
      titre: "Mon titre",
      description: "Texte",
    });
    expect(modif.json()).toMatchObject({ titreAnnonce: "Mon titre", descriptionAnnonce: "Texte" });
  });

  it("§8 — Gemini indisponible → message clair (503) ; le prompt reste disponible pour « Copier le prompt »", async () => {
    t.ia.repondre(iaIndisponible("Quota gratuit de Gemini atteint : réessayez plus tard."));
    const r = await requete("POST", `/api/articles/${t.articleId}/annonce/generation`);
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ erreur: "Quota gratuit de Gemini atteint : réessayez plus tard." });
    const prompt = (await requete("GET", `/api/articles/${t.articleId}/annonce/prompt`)).json<{ prompt: string }>()
      .prompt;
    expect(prompt).toContain("Jean 501");
    expect(prompt).toContain("W32");
  });

  it("prompt personnalisé dans les Réglages", async () => {
    await requete("PUT", "/api/reglages", { promptAnnonce: "Annonce pour {nom} de taille {taille} ({matiere})" });
    const prompt = (await requete("GET", `/api/articles/${t.articleId}/annonce/prompt`)).json<{ prompt: string }>()
      .prompt;
    expect(prompt).toBe("Annonce pour Jean 501 de taille W32 (non renseigné)");
  });

  it("§8 — lire l'étiquette : propositions renvoyées sans rien enregistrer", async () => {
    t.ia.repondre(
      '{"marque": "levi\'s", "taille": "W32 L34", "categorie": "jean slim homme", "matiere": "99 % coton"}',
    );
    const image = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#ffffff" } })
      .png()
      .toBuffer();
    const r = await t.app.inject({
      method: "POST",
      url: "/api/etiquette",
      headers: { cookie: t.cookie, "content-type": "image/png" },
      payload: image,
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toEqual({
      marque: "Levi's",
      taille: "W32 L34",
      categorie: "hommes/vetements/jeans/jeans-slim",
      categorieTexte: "jean slim homme",
      matiere: "99 % coton",
    });
    const fiche = (await requete("GET", `/api/articles/${t.articleId}`)).json<{
      taille: string;
      matiere: string | null;
    }>();
    expect(fiche).toMatchObject({ taille: "W32", matiere: null });
  });
});
