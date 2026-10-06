// Publication sur Vinted : file d'attente, jeton du programme, résultats (aucune requête vers Vinted).
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

describe("publication Vinted", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; jeton: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const jeton = (await base.app.inject({ method: "POST", url: "/api/publication/jeton", headers: { cookie } })).json<{
      jeton: string;
    }>().jeton;
    t = { ...base, cookie, jeton };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const programme = (method: "GET" | "POST", url: string, payload?: object, jeton = t.jeton) =>
    t.app.inject({ method, url, headers: { authorization: `Bearer ${jeton}` }, ...(payload ? { payload } : {}) });

  /** Article À publier, complet sauf ce qui est retiré. */
  async function article(sans: { photo?: boolean; couleur?: boolean } = {}) {
    const refs = (await requete("GET", "/api/referentiels")).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    const a = (
      await requete("POST", "/api/articles", {
        nom: "Jean",
        lieuId: refs.lieux[0]?.id,
        prixAchat: 300,
        dateAchat: "2026-10-01",
        categorie: "hommes/vetements/jeans/jeans-droits",
        marqueId: refs.marques[0]?.id,
        etat: "bon_etat",
        taille: "W32",
        couleurs: sans.couleur ? [] : ["bleu"],
        formatColis: "moyen",
        prixAffiche: 1250,
      })
    ).json<{ id: string; reference: number }>();
    await requete("POST", `/api/articles/${a.id}/statut`, { vers: "a_publier" });
    await requete("PUT", `/api/articles/${a.id}/annonce`, { titre: "Jean bleu", description: "Beau jean.\n\nRéf. 1" });
    if (!sans.photo) {
      const photoId = randomUUID();
      const image = await sharp({ create: { width: 30, height: 30, channels: 3, background: "#224488" } })
        .jpeg()
        .toBuffer();
      await t.app.inject({
        method: "PUT",
        url: `/api/photos/${photoId}?type=annonce`,
        headers: { cookie: t.cookie, "content-type": "image/jpeg" },
        payload: image,
      });
      await requete("POST", `/api/articles/${a.id}/photos`, { photoId });
    }
    return a;
  }

  it("refuse les articles incomplets en listant ce qui manque", async () => {
    const complet = await article();
    const incomplet = await article({ photo: true, couleur: true });
    const r = (await requete("POST", "/api/publications", { articleIds: [complet.id, incomplet.id] })).json<{
      acceptes: number[];
      refuses: { reference: number; manques: string[] }[];
    }>();
    expect(r.acceptes).toEqual([complet.reference]);
    expect(r.refuses).toEqual([
      { reference: incomplet.reference, nom: "Jean", manques: ["photos d'annonce", "couleur"] },
    ]);
    // Pas deux fois dans la file.
    const encore = (await requete("POST", "/api/publications", { articleIds: [complet.id] })).json<{
      refuses: unknown[];
    }>();
    expect(encore.refuses).toHaveLength(1);
  });

  it("jeton : obligatoire, limité aux routes du programme et à la lecture des photos", async () => {
    expect((await programme("GET", "/api/programme/suivante", undefined, "faux")).statusCode).toBe(401);
    expect(
      (await t.app.inject({ method: "GET", url: "/api/programme/suivante", headers: { cookie: t.cookie } })).statusCode,
    ).toBe(401);
    expect((await programme("GET", "/api/articles")).statusCode).toBe(401);
    expect((await programme("GET", "/api/programme/suivante")).json()).toEqual({ publication: null });
  });

  it("demande suivante : données prêtes à saisir, une seule à la fois ; photos lisibles avec le jeton", async () => {
    const a = await article();
    const b = await article();
    await requete("POST", "/api/publications", { articleIds: [a.id, b.id], essai: false });
    const { publication } = (await programme("GET", "/api/programme/suivante")).json<{
      publication: { id: string; essai: boolean; article: Record<string, unknown> & { photos: string[] } };
    }>();
    expect(publication.essai).toBe(false);
    expect(publication.article).toMatchObject({
      reference: a.reference,
      titre: "Jean bleu",
      prix: "12,50",
      categorie: ["Hommes", "Vêtements", "Jeans", "Jeans droits"],
      etat: "Bon état",
      taille: "W32",
      couleurs: ["Bleu"],
      formatColis: "moyen",
    });
    expect((await programme("GET", publication.article.photos[0] ?? "")).statusCode).toBe(200);
    expect((await programme("GET", "/api/programme/suivante")).json()).toEqual({ publication: null });
  });

  it("publié → l'article passe En ligne et garde le lien ; essai → rien ne change", async () => {
    const a = await article();
    await requete("POST", "/api/publications", { articleIds: [a.id], essai: false });
    const id = (await programme("GET", "/api/programme/suivante")).json<{ publication: { id: string } }>().publication
      .id;
    const url = "https://www.vinted.fr/items/123-jean";
    expect(
      (await programme("POST", `/api/programme/publications/${id}/resultat`, { resultat: "publie", url })).statusCode,
    ).toBe(200);
    expect((await requete("GET", `/api/articles/${a.id}`)).json()).toMatchObject({
      statut: "en_ligne",
      urlVinted: url,
      prixAffiche: 1250,
    });
    const b = await article();
    await requete("POST", "/api/publications", { articleIds: [b.id] });
    const idEssai = (await programme("GET", "/api/programme/suivante")).json<{
      publication: { id: string; essai: boolean };
    }>().publication;
    expect(idEssai.essai).toBe(true);
    await programme("POST", `/api/programme/publications/${idEssai.id}/resultat`, { resultat: "essai" });
    expect((await requete("GET", `/api/articles/${b.id}`)).json()).toMatchObject({
      statut: "a_publier",
      urlVinted: null,
    });
    const liste = (await requete("GET", "/api/publications")).json<{
      publications: { etat: string }[];
      programmeVuLe: string;
    }>();
    expect(liste.publications.map((p) => p.etat).sort()).toEqual(["essai", "publie"]);
    expect(liste.programmeVuLe).not.toBeNull();
  });

  it("erreur et annulation ; une publication interrompue n'est jamais relancée seule", async () => {
    const a = await article();
    const b = await article();
    await requete("POST", "/api/publications", { articleIds: [a.id, b.id] });
    const liste = (await requete("GET", "/api/publications")).json<{
      publications: { id: string; reference: number }[];
    }>();
    const pourB = liste.publications.find((p) => p.reference === b.reference)?.id ?? "";
    expect((await requete("DELETE", `/api/publications/${pourB}`)).statusCode).toBe(200);
    const id = (await programme("GET", "/api/programme/suivante")).json<{ publication: { id: string } }>().publication
      .id;
    t.horloge.avancer(16 * 60 * 1000);
    expect((await programme("GET", "/api/programme/suivante")).json()).toEqual({ publication: null });
    const etats = (await requete("GET", "/api/publications")).json<{
      publications: { id: string; etat: string; message: string }[];
    }>();
    expect(etats.publications.find((p) => p.id === id)).toMatchObject({
      etat: "erreur",
      message: expect.stringMatching(/Interrompue/),
    });
    expect(
      (await programme("POST", `/api/programme/publications/${id}/resultat`, { resultat: "publie", url: "x" }))
        .statusCode,
    ).toBe(409);
  });

  it("couleurs : 2 au plus, codes connus", async () => {
    const refs = (await requete("GET", "/api/referentiels")).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
      couleurs: unknown[];
    }>();
    expect(refs.couleurs.length).toBeGreaterThan(10);
    const base = {
      nom: "X",
      lieuId: refs.lieux[0]?.id,
      prixAchat: 1,
      dateAchat: "2026-10-01",
      categorie: "hommes/vetements/jeans/jeans-droits",
      marqueId: refs.marques[0]?.id,
      etat: "bon_etat",
    };
    expect((await requete("POST", "/api/articles", { ...base, couleurs: ["bleu", "noir", "rouge"] })).statusCode).toBe(
      400,
    );
    expect((await requete("POST", "/api/articles", { ...base, couleurs: ["fuchsia"] })).statusCode).toBe(400);
  });
});
