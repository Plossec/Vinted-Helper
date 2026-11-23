// Tâche « Offres reçues » (#150, ADR-0076) : lignes des offres reçues lues par l'extension, règles ADR-0076
// (acceptation si l'article est dormant depuis ≥ X jours, sinon contre-offre à mi-chemin, signalement sans
// minimum), AFUI « À faire » à valider, résultats, ventes créées quand payées (§6.4).
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { article, offreRecue, utilisateur, vente } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { creerVentesPayees } from "./finalisation.js";
import { planOffreRecue } from "./offres.js";

describe("tâche « Offres reçues »", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & {
    cookie: string;
    jeton: string;
    lieuId: string;
    marqueId: string;
  };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    const cookie = await seConnecter(base.app);
    const refs = (await base.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    const jeton = (await base.app.inject({ method: "POST", url: "/api/publication/jeton", headers: { cookie } })).json<{
      jeton: string;
    }>().jeton;
    t = { ...base, cookie, jeton, lieuId: refs.lieux[0]?.id ?? "", marqueId: refs.marques[0]?.id ?? "" };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const extension = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { authorization: `Bearer ${t.jeton}` }, ...(payload ? { payload } : {}) });
  const regler = (extra: object = {}) =>
    requete("PUT", "/api/reglages", {
      offresRecuesActive: true,
      offresRecuesMode: "manuel",
      offresRecuesEssai: false,
      ...extra,
    });

  /** Numéro de l'annonce Vinted de chaque article de test (lien Vinted « /items/{numéro}-… »). */
  const numeros = new Map<string, string>();
  const annonce = (id: string) => numeros.get(id) ?? "";

  /** Article En ligne à 11 €, minimum 5 €, annonce « titre », publié sur Vinted (lien avec un numéro d'annonce). */
  async function enLigne(titre: string, extra: object = {}) {
    const id = (
      await requete("POST", "/api/articles", {
        nom: titre,
        lieuId: t.lieuId,
        prixAchat: 200,
        dateAchat: "2026-09-01",
        categorie: "hommes/vetements/jeans/jeans-coupe-droite",
        marqueId: t.marqueId,
        etat: "bon_etat",
        prixAffiche: 1100,
        prixVenteMinimum: 500,
        ...extra,
      })
    ).json<{ id: string }>().id;
    expect((await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne" })).statusCode).toBe(200);
    const numero = String(100 + numeros.size);
    numeros.set(id, numero);
    await t.base
      .update(article)
      .set({ titreAnnonce: titre, urlVinted: `https://www.vinted.fr/items/${numero}-annonce` })
      .where(eq(article.id, id));
    return id;
  }

  it("règles ADR-0076 : acceptation, contre-offre à mi-chemin, signalement", () => {
    expect(planOffreRecue({ prixVenteMinimum: 500, prixAffiche: 1100 }, { prixOffre: 600 }, true)).toEqual({
      etat: "accepter",
      prixContreOffre: null,
    });
    expect(planOffreRecue({ prixVenteMinimum: 500, prixAffiche: 1100 }, { prixOffre: 600 }, false)).toEqual({
      etat: "contreOffre",
      prixContreOffre: 850,
    });
    expect(planOffreRecue({ prixVenteMinimum: 500, prixAffiche: 1100 }, { prixOffre: 300 }, true)).toEqual({
      etat: "contreOffre",
      prixContreOffre: 700,
    });
    expect(planOffreRecue({ prixVenteMinimum: null, prixAffiche: 1100 }, { prixOffre: 300 }, true)).toEqual({
      etat: "signaler",
      prixContreOffre: null,
    });
    expect(planOffreRecue({ prixVenteMinimum: 500, prixAffiche: null }, { prixOffre: 600 }, true)).toEqual({
      etat: "signaler",
      prixContreOffre: null,
    });
  });

  it("offres reçues : lignes à valider, contre-offre, signalement sans minimum, idempotent", async () => {
    const a = await enLigne("Sac à dos");
    const d = {
      offreId: "offre-1",
      articleId: annonce(a),
      transactionId: "tid-1",
      offerRequestId: "orid-1",
      prixOffre: 700,
      depuis: "2026-11-20T10:00:00.000Z",
    };
    const r = await extension("POST", "/api/programme/offres-recues", { offres: [d] });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ nouvelles: 1, ignores: [] });
    const [l] = await t.base.select().from(offreRecue);
    expect(l).toMatchObject({
      articleId: a,
      offreId: "offre-1",
      prixOffre: 700,
      etat: "a_valider",
      prixContreOffre: 900,
    });
    // « À faire » : offre à valider, avec le prix de la contre-offre
    expect((await requete("GET", "/api/taches/offres-recues")).json()).toMatchObject([
      { articleId: a, prixOffre: 700, prixContreOffre: 900 },
    ]);
    // Idempotent : même lecture : rien de nouveau
    expect((await extension("POST", "/api/programme/offres-recues", { offres: [d] })).json()).toMatchObject({
      nouvelles: 0,
    });
    expect((await t.base.select().from(offreRecue)).length).toBe(1);
    // Sans minimum : offre signalée
    const b = await enLigne("Article sans min", { prixVenteMinimum: null });
    const r2 = await extension("POST", "/api/programme/offres-recues", {
      offres: [
        {
          offreId: "offre-2",
          articleId: annonce(b),
          transactionId: "tid-2",
          offerRequestId: null,
          prixOffre: 100,
          depuis: "2026-11-20T10:00:00.000Z",
        },
      ],
    });
    expect(r2.statusCode).toBe(200);
    expect((await t.base.select().from(offreRecue).where(eq(offreRecue.articleId, b))).at(0)?.etat).toBe("signale");
    expect(
      (await requete("GET", "/api/taches/offres-recues")).json().find((l: { articleId: string }) => l.articleId === b)
        ?.message,
    ).toMatch(/minimum vendeur/);
  });

  it("lecture seule (#302) : même en mode automatique, l'offre reste à valider ; rien n'est confié à l'extension", async () => {
    await regler({ offresRecuesMode: "automatique" });
    const a = await enLigne("Offre auto");
    await extension("POST", "/api/programme/offres-recues", {
      offres: [
        {
          offreId: "offre-3",
          articleId: annonce(a),
          transactionId: "tid-3",
          offerRequestId: "orid-3",
          prixOffre: 900,
          depuis: "2026-11-21T10:00:00.000Z",
        },
      ],
    });
    expect(
      (await t.base.select({ etat: offreRecue.etat }).from(offreRecue).where(eq(offreRecue.articleId, a))).at(0)?.etat,
    ).toBe("a_valider");
    expect((await extension("GET", "/api/programme/offres-recues/suivante")).statusCode).toBe(404);
  });

  it("annonce sans article dans l'application : offre ignorée avec la raison", async () => {
    const r = await extension("POST", "/api/programme/offres-recues", {
      offres: [
        {
          offreId: "offre-x",
          articleId: "999999",
          transactionId: null,
          offerRequestId: "orid-x",
          prixOffre: 500,
          depuis: "2026-11-21T10:00:00.000Z",
        },
      ],
    });
    expect(r.json()).toMatchObject({ nouvelles: 0 });
    expect(r.json<{ ignores: string[] }>().ignores[0]).toMatch(/annonce 999999 sans article/);
  });

  it("lecture due : à la fréquence après une lecture, et à toute heure après « Lancer maintenant »", async () => {
    await regler();
    const attente = async () =>
      (await extension("GET", "/api/programme/attente")).json<{ lectureOffresRecues: boolean }>().lectureOffresRecues;
    expect(await attente()).toBe(true);
    await extension("POST", "/api/programme/offres-recues", { offres: [] });
    expect(await attente()).toBe(false);
    expect((await requete("POST", "/api/taches/offres-recues/lancer")).statusCode).toBe(200);
    expect(await attente()).toBe(true);
    await extension("POST", "/api/programme/offres-recues", { offres: [] });
    expect(await attente()).toBe(false);
  });

  it("vente créée quand payée (ADR-0076) : article « À expédier », prix accepté, date de fin Vinted", async () => {
    const a = await enLigne("Acheté");
    await t.base.update(article).set({ urlVinted: "https://www.vinted.fr/items/321-achete" }).where(eq(article.id, a));
    const [u] = await t.base.select().from(utilisateur);
    if (!u) throw new Error("Utilisateur introuvable.");
    await t.base.insert(offreRecue).values({
      utilisateurId: u.id,
      articleId: a,
      offreId: "offre-payee",
      transactionId: "tid-4",
      prixOffre: 900,
      depuis: new Date("2026-11-21T10:00:00Z"),
      etat: "faite",
      creeLe: new Date("2026-11-21T10:00:00Z"),
    });
    const dateFin = new Date("2026-11-22T10:00:00Z");
    const n = await t.base.transaction((tx) =>
      creerVentesPayees(tx, u.id, [{ annonces: ["321"], dateFin, montant: null }], t.horloge.maintenant()),
    );
    expect(n).toBe(1);
    expect((await t.base.select().from(article).where(eq(article.id, a))).at(0)?.statut).toBe("a_expedier");
    expect((await t.base.select().from(vente)).at(0)).toMatchObject({ montantCredite: 900, dateVente: dateFin });
  });
});
