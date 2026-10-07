// Ventes, colis, retours, sorties du stock, boosts, frais divers et réglages (lot 3) — critères du §8.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

interface ArticleLu {
  id: string;
  statut: string;
  transitionsPossibles: string[];
  urlConversation: string | null;
  historiqueStatuts: { id: string; de: string | null; vers: string; date: string }[];
  couts: {
    prixAchat: number;
    emballage: number;
    boosts: number;
    coutTotal: number;
    prixVendu: number | null;
    benefice: number;
    realise: boolean;
  };
  vente: { id: string; montantCredite: number; nombreArticles: number; dateFinalisation: string | null } | null;
  boosts: { id: string; montant: number }[];
  historiquePrix: { prix: number }[];
  sortieStock: { motif: string; prixRevente: number | null } | null;
}

interface VenteLue {
  id: string;
  annulee: boolean;
  montantCredite: number;
  articles: { id: string; statut: string; prixVendu: number | null; partEmballage: number; retourne: boolean }[];
}

describe("ventes et calculs", () => {
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

  const requete = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const lire = async (id: string) => (await requete("GET", `/api/articles/${id}`)).json<ArticleLu>();

  /** Article En ligne affiché au prix donné (centimes). */
  async function enLigne(prixAffiche: number, prixAchat = 200) {
    const cree = await requete("POST", "/api/articles", {
      nom: "Article",
      lieuId: t.lieuId,
      prixAchat,
      dateAchat: "2026-09-01",
      categorie: "hommes/vetements/jeans/jeans-droits",
      marqueId: t.marqueId,
      etat: "bon_etat",
    });
    const id = cree.json<{ id: string }>().id;
    expect((await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne", prixAffiche })).statusCode).toBe(
      200,
    );
    return id;
  }

  async function vendre(articleIds: string[], montantCredite: number, extra: object = {}) {
    const r = await requete("POST", "/api/ventes", { articleIds, montantCredite, ...extra });
    expect(r.statusCode, r.body).toBe(201);
    return r.json<VenteLue>();
  }

  it("§8 — 9 € et 6 € vendus ensemble 12 € → 7,20 € et 4,80 €, emballage 0,04 € chacun", async () => {
    const a = await enLigne(900);
    const b = await enLigne(600);
    const v = await vendre([a, b], 1200);
    expect(v.articles.map((l) => [l.prixVendu, l.partEmballage, l.statut])).toEqual([
      [720, 4, "a_expedier"],
      [480, 4, "a_expedier"],
    ]);
    expect((await lire(a)).vente).toMatchObject({ montantCredite: 1200, nombreArticles: 2 });
  });

  it("lien de la conversation Vinted (#48) : enregistré sur chaque article du colis, visible dans l'alerte", async () => {
    const a = await enLigne(900);
    const b = await enLigne(600);
    const lien = "https://www.vinted.fr/inbox/123456789";
    await vendre([a, b], 1200, { urlConversation: lien });
    expect([(await lire(a)).urlConversation, (await lire(b)).urlConversation]).toEqual([lien, lien]);
    const alertes = (await requete("GET", "/api/alertes")).json<{
      aExpedier: { id: string; urlConversation: string }[];
    }>();
    expect(alertes.aExpedier.map((x) => x.urlConversation)).toEqual([lien, lien]);

    // Modifiable ensuite sur la fiche ; vide = retiré ; adresse hors Vinted refusée.
    const autre = "https://www.vinted.fr/inbox/987";
    const r = await requete("PUT", `/api/articles/${a}/lien-conversation`, { url: autre });
    expect(r.json()).toMatchObject({ urlConversation: autre });
    expect((await requete("PUT", `/api/articles/${a}/lien-conversation`, { url: "" })).json()).toMatchObject({
      urlConversation: null,
    });
    expect(
      (await requete("PUT", `/api/articles/${a}/lien-conversation`, { url: "https://exemple.fr" })).statusCode,
    ).toBe(400);
    const c = await enLigne(500);
    expect(
      (await requete("POST", "/api/ventes", { articleIds: [c], montantCredite: 500, urlConversation: "x" })).statusCode,
    ).toBe(400);
    // Sans lien : la vente se fait quand même.
    await vendre([c], 500);
    expect((await lire(c)).urlConversation).toBeNull();
  });

  it("§8 — colis de 2 articles À expédier marqué Envoyé → les 2 passent Envoyé avec la même date", async () => {
    const a = await enLigne(900);
    const b = await enLigne(600);
    const v = await vendre([a, b], 1200);
    const date = "2026-10-04T09:30:00.000Z";
    expect((await requete("POST", `/api/ventes/${v.id}/envoi`, { date })).statusCode).toBe(200);
    for (const id of [a, b]) {
      const lu = await lire(id);
      expect(lu.statut).toBe("envoye");
      expect(lu.historiqueStatuts.find((h) => h.vers === "envoye")).toMatchObject({ de: "a_expedier", date });
    }
  });

  it("§8 / cas 22 — À expédier, l'acheteur annule → repasse En ligne, vente annulée et hors calculs", async () => {
    const a = await enLigne(900);
    const v = await vendre([a], 900);
    const r = await requete("POST", `/api/ventes/${v.id}/annulation`, {});
    expect(r.json<VenteLue>().annulee).toBe(true);
    const lu = await lire(a);
    expect(lu.statut).toBe("en_ligne");
    expect(lu.vente).toBeNull();
    expect(lu.couts).toMatchObject({ prixVendu: null, emballage: 0 });
  });

  it("§8 — un article Finalisé ne propose plus aucune transition ; bénéfice réalisé", async () => {
    const a = await enLigne(900, 333);
    const v = await vendre([a], 900);
    await requete("POST", `/api/ventes/${v.id}/envoi`, {});
    await requete("POST", `/api/ventes/${v.id}/finalisation`, { date: "2026-10-04T08:00:00.000Z" });
    const lu = await lire(a);
    expect(lu.statut).toBe("finalise");
    expect(lu.transitionsPossibles).toEqual([]);
    expect(lu.couts).toMatchObject({ prixVendu: 900, emballage: 8, benefice: 900 - 333 - 8, realise: true });
    expect(lu.vente?.dateFinalisation).toBe("2026-10-04T08:00:00.000Z");
  });

  // Cas 26 et 27 modifiés le 07/10/2026 avec l'accord de l'utilisateur (issue #52) : « À récupérer » au lieu d'« À publier ».
  it("§8 / cas 26 — colis Envoyé, B renvoyé, nouveau montant 7,20 € → B À récupérer, A porte tout l'emballage", async () => {
    const a = await enLigne(900);
    const b = await enLigne(600);
    const v = await vendre([a, b], 1200);
    await requete("POST", `/api/ventes/${v.id}/envoi`, {});
    const sansMontant = await requete("POST", `/api/ventes/${v.id}/retour`, { articleIds: [b] });
    expect(sansMontant.statusCode).toBe(400);
    const r = await requete("POST", `/api/ventes/${v.id}/retour`, { articleIds: [b], montantCredite: 720 });
    expect(r.statusCode, r.body).toBe(200);
    expect(await lire(b)).toMatchObject({
      statut: "a_recuperer",
      vente: null,
      couts: { prixVendu: null, emballage: 0 },
    });
    expect(await lire(a)).toMatchObject({ statut: "envoye", couts: { prixVendu: 720, emballage: 8 } });
  });

  it("cas 27 — retour du colis entier → tous À récupérer, vente annulée", async () => {
    const a = await enLigne(900);
    const b = await enLigne(600);
    const v = await vendre([a, b], 1200);
    await requete("POST", `/api/ventes/${v.id}/envoi`, {});
    const r = await requete("POST", `/api/ventes/${v.id}/retour`, { articleIds: [a, b] });
    expect(r.json<VenteLue>().annulee).toBe(true);
    for (const id of [a, b]) expect((await lire(id)).statut).toBe("a_recuperer");
  });

  it("refus : vendre un article qui n'est pas En ligne ; envoyer une vente annulée ; date future", async () => {
    const a = await enLigne(900);
    const v = await vendre([a], 900);
    expect((await requete("POST", "/api/ventes", { articleIds: [a], montantCredite: 900 })).statusCode).toBe(409);
    await requete("POST", `/api/ventes/${v.id}/annulation`, {});
    expect((await requete("POST", `/api/ventes/${v.id}/envoi`, {})).statusCode).toBe(409);
    const b = await enLigne(500);
    const futur = await requete("POST", "/api/ventes", {
      articleIds: [b],
      montantCredite: 500,
      date: "2030-01-01T00:00:00Z",
    });
    expect(futur.statusCode).toBe(400);
  });

  it("emballage par défaut modifiable dans les Réglages et dans la vente", async () => {
    expect((await requete("GET", "/api/reglages")).json()).toMatchObject({ emballageDefaut: 8 });
    await requete("PUT", "/api/reglages", { emballageDefaut: 10 });
    const a = await enLigne(900);
    expect((await lire((await vendre([a], 900)).articles[0]?.id ?? "")).couts.emballage).toBe(10);
    const b = await enLigne(900);
    const v = await vendre([b], 900, { emballage: 0 });
    expect(v.articles[0]?.partEmballage).toBe(0);
  });

  it("corriger la date de finalisation dans l'historique met à jour la vente et tout le colis", async () => {
    const a = await enLigne(900);
    const b = await enLigne(600);
    const v = await vendre([a, b], 1200);
    await requete("POST", `/api/ventes/${v.id}/envoi`, {});
    await requete("POST", `/api/ventes/${v.id}/finalisation`, {});
    const ligne = (await lire(a)).historiqueStatuts.find((h) => h.vers === "finalise");
    const date = "2026-10-01T12:00:00.000Z";
    expect((await requete("PUT", `/api/historique-statuts/${ligne?.id ?? ""}`, { date })).statusCode).toBe(200);
    expect((await lire(b)).historiqueStatuts.find((h) => h.vers === "finalise")?.date).toBe(date);
    expect((await lire(a)).vente?.dateFinalisation).toBe(date);
  });

  it("cas 13 — boost 1,50 € compté dans le coût total ; suppression possible", async () => {
    const a = await enLigne(1000, 400);
    const r = await requete("POST", `/api/articles/${a}/boosts`, { montant: 150, date: "2026-10-02" });
    expect(r.statusCode).toBe(201);
    const lu = r.json<ArticleLu>();
    expect(lu.couts.boosts).toBe(150);
    const v = await vendre([a], 1000);
    await requete("POST", `/api/ventes/${v.id}/envoi`, {});
    await requete("POST", `/api/ventes/${v.id}/finalisation`, {});
    expect((await lire(a)).couts.benefice).toBe(442);
    await requete("DELETE", `/api/boosts/${lu.boosts[0]?.id ?? ""}`);
    expect((await lire(a)).couts.boosts).toBe(0);
  });

  it("cas 15 et 17 — sortie du stock : Donné (perte) ; Revendu hors Vinted (prix + canal obligatoires)", async () => {
    const a = await enLigne(900, 440);
    let r = await requete("POST", `/api/articles/${a}/sortie-stock`, { motif: "donne" });
    expect(r.json<ArticleLu>()).toMatchObject({ statut: "sortie_stock", couts: { benefice: -440, realise: true } });
    r = await requete("POST", `/api/articles/${a}/annulation-sortie-stock`, {});
    expect(r.json<ArticleLu>()).toMatchObject({ statut: "a_publier", sortieStock: null });
    expect((await requete("POST", `/api/articles/${a}/sortie-stock`, { motif: "revendu" })).statusCode).toBe(400);
    r = await requete("POST", `/api/articles/${a}/sortie-stock`, {
      motif: "revendu",
      prixRevente: 500,
      canal: "vide_grenier",
    });
    expect(r.json<ArticleLu>()).toMatchObject({
      sortieStock: { motif: "revendu", prixRevente: 500 },
      couts: { benefice: 60 },
    });
  });

  it("sortie du stock refusée pour un article dans un colis en cours", async () => {
    const a = await enLigne(900);
    await vendre([a], 900);
    expect((await requete("POST", `/api/articles/${a}/sortie-stock`, { motif: "perdu" })).statusCode).toBe(409);
  });

  it("historique des prix affichés", async () => {
    const a = await enLigne(900);
    const fiche = await lire(a);
    expect(fiche.historiquePrix.map((p) => p.prix)).toEqual([900]);
  });

  it("frais divers : ajout, modification, suppression", async () => {
    const r = await requete("POST", "/api/frais", {
      date: "2026-10-10",
      montant: 300,
      libelle: "Rouleau d'étiquettes",
    });
    expect(r.statusCode).toBe(201);
    const id = r.json<{ id: string }>().id;
    await requete("PUT", `/api/frais/${id}`, { date: "2026-10-10", montant: 350, libelle: "Étiquettes" });
    expect((await requete("GET", "/api/frais")).json()).toEqual([
      { id, date: "2026-10-10", montant: 350, libelle: "Étiquettes" },
    ]);
    expect((await requete("POST", "/api/frais", { date: "2026-10-10", montant: 300 })).statusCode).toBe(400);
    await requete("DELETE", `/api/frais/${id}`);
    expect((await requete("GET", "/api/frais")).json()).toEqual([]);
  });

  describe("supprimer le dernier changement de statut (#50)", () => {
    const annuler = (id: string, corps: object = {}) => requete("POST", `/api/articles/${id}/annulation-statut`, corps);
    const statuts = async (...ids: string[]) => Promise.all(ids.map(async (id) => (await lire(id)).statut));

    it("passage simple : retour au statut précédent ; la création ne se supprime pas", async () => {
      const a = await enLigne(900);
      expect((await annuler(a)).statusCode).toBe(200);
      const lu = await lire(a);
      expect(lu.statut).toBe("brouillon");
      expect(lu.historiqueStatuts.map((h) => h.vers)).toEqual(["brouillon"]);
      expect((await annuler(a)).statusCode).toBe(409);
    });

    it("« Vendu » d'un article seul : la vente disparaît, l'article repasse En ligne", async () => {
      const a = await enLigne(900);
      const v = await vendre([a], 900, { urlConversation: "https://www.vinted.fr/inbox/1" });
      expect((await annuler(a)).statusCode).toBe(200);
      expect(await lire(a)).toMatchObject({ statut: "en_ligne", urlConversation: null });
      expect((await requete("GET", `/api/ventes/${v.id}`)).statusCode).toBe(404);
    });

    it("« Vendu » dans un colis groupé : seul l'article sort, nouveau montant demandé pour les autres", async () => {
      const a = await enLigne(900);
      const b = await enLigne(600);
      const v = await vendre([a, b], 1200);
      expect((await annuler(a)).statusCode).toBe(400);
      expect((await annuler(a, { montantCredite: 600 })).statusCode).toBe(200);
      expect(await statuts(a, b)).toEqual(["en_ligne", "a_expedier"]);
      const apres = (await requete("GET", `/api/ventes/${v.id}`)).json<VenteLue>();
      expect(apres.montantCredite).toBe(600);
      expect(apres.articles.map((l) => l.id)).toEqual([b]);
    });

    it("« Envoyé » puis « Finalisé » : défaits pour tout le colis, dates effacées", async () => {
      const a = await enLigne(900);
      const b = await enLigne(600);
      const v = await vendre([a, b], 1200);
      await requete("POST", `/api/ventes/${v.id}/envoi`, {});
      await requete("POST", `/api/ventes/${v.id}/finalisation`, {});
      expect((await annuler(a)).statusCode).toBe(200);
      expect(await statuts(a, b)).toEqual(["envoye", "envoye"]);
      expect((await annuler(b)).statusCode).toBe(200);
      expect(await statuts(a, b)).toEqual(["a_expedier", "a_expedier"]);
      const apres = (await requete("GET", `/api/ventes/${v.id}`)).json<{
        dateEnvoi: string | null;
        dateFinalisation: string | null;
      }>();
      expect(apres).toMatchObject({ dateEnvoi: null, dateFinalisation: null });
    });

    it("annulation par l'acheteur supprimée : la vente redevient active pour tout le colis", async () => {
      const a = await enLigne(900);
      const b = await enLigne(600);
      const v = await vendre([a, b], 1200);
      await requete("POST", `/api/ventes/${v.id}/annulation`, {});
      expect((await annuler(b)).statusCode).toBe(200);
      expect(await statuts(a, b)).toEqual(["a_expedier", "a_expedier"]);
      expect((await requete("GET", `/api/ventes/${v.id}`)).json<VenteLue>().annulee).toBe(false);
    });

    it("« Récupéré » : À récupérer → À publier ou En ligne ; supprimer « Récupéré » revient à À récupérer", async () => {
      const a = await enLigne(900);
      const v = await vendre([a], 900);
      await requete("POST", `/api/ventes/${v.id}/envoi`, {});
      await requete("POST", `/api/ventes/${v.id}/retour`, { articleIds: [a] });
      expect((await lire(a)).statut).toBe("a_recuperer");
      expect((await lire(a)).transitionsPossibles).toEqual(["a_publier", "en_ligne", "sortie_stock"]);
      expect((await requete("POST", `/api/articles/${a}/statut`, { vers: "en_ligne" })).statusCode).toBe(200);
      expect((await annuler(a)).statusCode).toBe(200);
      expect((await lire(a)).statut).toBe("a_recuperer");
      expect((await requete("POST", `/api/articles/${a}/statut`, { vers: "a_publier" })).statusCode).toBe(200);
      const alertes = (await requete("GET", "/api/alertes")).json<{ aRecuperer: unknown[] }>();
      expect(alertes.aRecuperer).toHaveLength(0);
    });

    it("sortie du stock supprimée : motif effacé ; un retour ne se supprime pas", async () => {
      const a = await enLigne(900);
      await requete("POST", `/api/articles/${a}/sortie-stock`, { motif: "donne" });
      expect((await annuler(a)).statusCode).toBe(200);
      expect(await lire(a)).toMatchObject({ statut: "en_ligne", sortieStock: null });

      const b = await enLigne(600);
      const v = await vendre([b], 600);
      await requete("POST", `/api/ventes/${v.id}/envoi`, {});
      await requete("POST", `/api/ventes/${v.id}/retour`, { articleIds: [b] });
      expect((await annuler(b)).statusCode).toBe(409);
    });
  });
});
