// Tâche « Offres aux favoris » (#149, étape 2, ADR-0123) : favoris lus par l'extension, offres prévues, confiées une à
// une à l'extension après le délai, liste à valider, journal. La personne n'est connue que par une empreinte.
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { article, historiqueStatut, offreFavori } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

const JOUR_MS = 86_400_000;
const empreinte = (pseudo: string) => createHash("sha256").update(pseudo).digest("hex");

describe("tâche « Offres aux favoris »", () => {
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
  const extension = (method: "GET" | "POST", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { authorization: `Bearer ${t.jeton}` }, ...(payload ? { payload } : {}) });
  const regler = (extra: object = {}) =>
    requete("PUT", "/api/reglages", { favorisActive: true, favorisMode: "automatique", favorisEssai: false, ...extra });
  const depuis = (jours: number) => new Date(t.horloge.maintenant().getTime() - jours * JOUR_MS).toISOString();

  /** Article En ligne à 11 €, minimum 5 €, annonce « titre ». */
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
    await t.base.update(article).set({ titreAnnonce: titre }).where(eq(article.id, id));
    return id;
  }

  it("lecture due une fois activée ; favoris → offres au prix de la règle de baisse, une par personne et article", async () => {
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({ lectureFavoris: false });
    await regler();
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({
      lectureFavoris: true,
      offres: 0,
    });
    const sac = await enLigne("Sac à dos léopard");
    await enLigne("T-shirt noir S");
    await enLigne("T-shirt noir S");
    const r = await extension("POST", "/api/programme/favoris", {
      favoris: [
        { personne: empreinte("acheteur1"), titre: "SAC À DOS LÉOPARD", depuis: depuis(3) },
        { personne: empreinte("acheteur1"), titre: "Sac à dos léopard", depuis: depuis(3) }, // déjà vue : une seule offre
        { personne: empreinte("acheteur2"), titre: "T-shirt noir S", depuis: depuis(3) }, // titre en double
        { personne: empreinte("acheteur3"), titre: "Article inconnu", depuis: depuis(3) },
      ],
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ lus: 4, nouvelles: 1 });
    expect(r.json<{ ignores: string[] }>().ignores).toHaveLength(2);
    const offres = await t.base.select().from(offreFavori);
    expect(offres).toMatchObject([
      { articleId: sac, personne: empreinte("acheteur1"), prixAvant: 1100, prixOffre: 1000 },
    ]);
    // Lecture faite : plus due avant 24 h.
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({
      lectureFavoris: false,
      offres: 0, // article publié aujourd'hui : pas encore due (#295)
    });
    // Jamais le pseudo : seule une empreinte est acceptée.
    expect(
      (
        await extension("POST", "/api/programme/favoris", {
          favoris: [{ personne: "acheteur1", titre: "Sac à dos léopard", depuis: depuis(3) }],
        })
      ).statusCode,
    ).toBe(400);
  });

  it("offre confiée N jours après la publication de l'article (pas du favori), une à la fois, puis faite (#295)", async () => {
    await regler({ favorisDelaiJours: 2 });
    await enLigne("Sac à dos léopard"); // publié maintenant
    await extension("POST", "/api/programme/favoris", {
      favoris: [{ personne: empreinte("acheteur1"), titre: "Sac à dos léopard", depuis: depuis(10) }],
    });
    // Favori ancien, mais article publié aujourd'hui : rien avant 2 jours.
    expect((await extension("GET", "/api/programme/offre-suivante")).json()).toEqual({ offre: null });
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({ offres: 0 });
    t.horloge.avancer(JOUR_MS);
    expect((await extension("GET", "/api/programme/offre-suivante")).json()).toEqual({ offre: null });
    t.horloge.avancer(JOUR_MS + 60_000);
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({ offres: 1 });
    const { offre } = (await extension("GET", "/api/programme/offre-suivante")).json<{
      offre: { id: string; prix: string; titre: string; personne: string; essai: boolean };
    }>();
    expect(offre).toMatchObject({
      prix: "10,00",
      titre: "Sac à dos léopard",
      personne: empreinte("acheteur1"),
      essai: false,
    });
    expect((await extension("GET", "/api/programme/offre-suivante")).json()).toEqual({ offre: null }); // une à la fois
    expect(
      (await extension("POST", `/api/programme/offres/${offre.id}/resultat`, { resultat: "faite" })).statusCode,
    ).toBe(200);
    expect(
      (await extension("POST", `/api/programme/offres/${offre.id}/resultat`, { resultat: "faite" })).statusCode,
    ).toBe(409);
    const journal = (await requete("GET", "/api/taches/journal?tache=favoris")).json<{ lignes: unknown[] }>().lignes;
    expect(journal).toMatchObject([
      { tache: "favoris", etat: "faite", action: { type: "offre", prixAvant: 1100, prixApres: 1000 } },
    ]);
  });

  it("article sans passage « En ligne » connu : la date d'achat sert de date de publication (#314)", async () => {
    await regler({ favorisDelaiJours: 2 });
    const id = await enLigne("Veste en jean"); // achetée le 01/09/2026
    await t.base.delete(historiqueStatut).where(eq(historiqueStatut.articleId, id));
    const r = await extension("POST", "/api/programme/favoris", {
      favoris: [{ personne: empreinte("acheteur9"), titre: "Veste en jean", depuis: depuis(1) }],
    });
    expect(r.json()).toMatchObject({ nouvelles: 1, dues: 1 });
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({ offres: 1 });
    const { offre } = (await extension("GET", "/api/programme/offre-suivante")).json<{ offre: { titre: string } }>();
    expect(offre).toMatchObject({ titre: "Veste en jean" });
  });

  it("offre moins chère déjà dans la conversation : rien n'est envoyé, offre annulée avec la raison (#295)", async () => {
    await regler({ favorisDelaiJours: 1 });
    await enLigne("Sac à dos léopard");
    await extension("POST", "/api/programme/favoris", {
      favoris: [{ personne: empreinte("acheteur1"), titre: "Sac à dos léopard", depuis: depuis(1) }],
    });
    t.horloge.avancer(2 * JOUR_MS);
    const { offre } = (await extension("GET", "/api/programme/offre-suivante")).json<{ offre: { id: string } }>();
    const message = "Offre déjà faite dans la conversation à 8,00 € (≤ 10,00 €) : rien n'est envoyé.";
    expect(
      (await extension("POST", `/api/programme/offres/${offre.id}/resultat`, { resultat: "inutile", message }))
        .statusCode,
    ).toBe(200);
    expect(await t.base.select({ etat: offreFavori.etat, message: offreFavori.message }).from(offreFavori)).toEqual([
      { etat: "annulee", message },
    ]);
  });

  it("mode manuel : offre à valider dans la liste des tâches, puis « Appliquer » ; article vendu entre-temps : annulée", async () => {
    await regler({ favorisMode: "manuel" });
    const id = await enLigne("Sac à dos léopard");
    await extension("POST", "/api/programme/favoris", {
      favoris: [{ personne: empreinte("acheteur1"), titre: "Sac à dos léopard", depuis: depuis(3) }],
    });
    const { aValider } = (await requete("GET", "/api/taches/actions")).json<{
      aValider: { id: string; type: string }[];
    }>();
    expect(aValider).toMatchObject([{ type: "offre", prixApres: 1000 }]);
    expect((await requete("POST", "/api/taches/actions/appliquer", { ids: [aValider[0]?.id] })).json()).toEqual({
      nombre: 1,
    });
    await t.base.update(article).set({ statut: "a_expedier" }).where(eq(article.id, id)); // vendu entre-temps
    expect((await extension("GET", "/api/programme/offre-suivante")).json()).toEqual({ offre: null });
    expect((await t.base.select().from(offreFavori))[0]?.etat).toBe("annulee");
  });

  it("sans prix vente minimum : pas d'offre ; « Lancer maintenant » rend la lecture due à toute heure", async () => {
    await regler({ favorisActive: false });
    await enLigne("Sac à dos léopard", { prixVenteMinimum: null });
    expect((await requete("POST", "/api/taches/favoris/lancer", {})).statusCode).toBe(200);
    expect((await extension("GET", "/api/programme/attente")).json()).toMatchObject({ lectureFavoris: true });
    const r = await extension("POST", "/api/programme/favoris", {
      favoris: [{ personne: empreinte("acheteur1"), titre: "Sac à dos léopard", depuis: depuis(3) }],
    });
    expect(r.json()).toMatchObject({ nouvelles: 0, ignores: [expect.stringContaining("pas de prix d'offre")] });
  });
});
