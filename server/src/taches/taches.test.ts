// Tâche « Articles dormants » (#147) : planification au passage de l'extension, liste à valider, Invendu, réglages.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { actionVinted, article } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

interface ActionLue {
  id: string;
  articleId: string;
  type: string;
  etat: string;
  prixAvant: number;
  prixApres: number | null;
  essai: boolean;
}
interface Actions {
  aValider: ActionLue[];
  journal: ActionLue[];
}

const JOUR_MS = 86_400_000;

describe("tâche « Articles dormants »", () => {
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
  /** Passage de l'extension (toutes les 5 minutes). */
  const passage = () =>
    t.app.inject({ method: "GET", url: "/api/programme/attente", headers: { authorization: `Bearer ${t.jeton}` } });
  const actions = async () => (await requete("GET", "/api/taches/actions")).json<Actions>();
  const reglerTache = (extra: object = {}) =>
    requete("PUT", "/api/reglages", { dormantsActive: true, dormantsMode: "manuel", ...extra });

  /** Article En ligne à 11 €, minimum 5 €, avec le lien de son annonce. */
  async function enLigne(extra: object = {}) {
    const donnees = {
      nom: "Jean",
      lieuId: t.lieuId,
      prixAchat: 200,
      dateAchat: "2026-09-01",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      marqueId: t.marqueId,
      etat: "bon_etat",
      prixAffiche: 1100,
      prixVenteMinimum: 500,
      ...extra,
    };
    const id = (await requete("POST", "/api/articles", donnees)).json<{ id: string }>().id;
    expect((await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne" })).statusCode).toBe(200);
    await requete("PUT", `/api/articles/${id}/lien-vinted`, { url: "https://www.vinted.fr/items/123-jean" });
    return id;
  }

  it("désactivée par défaut : aucun passage ne prévoit d'action", async () => {
    await enLigne();
    t.horloge.avancer(8 * JOUR_MS);
    expect((await passage()).statusCode).toBe(200);
    expect((await actions()).aValider).toEqual([]);
  });

  it("mode manuel : baisse proposée, à valider ; une seule fois par jour ; « Appliquer » la met en attente", async () => {
    const a = await enLigne();
    expect((await reglerTache()).statusCode).toBe(200);
    t.horloge.avancer(3 * JOUR_MS);
    await passage();
    expect((await actions()).aValider).toEqual([]); // pas encore dormant
    t.horloge.avancer(5 * JOUR_MS);
    await passage();
    const liste = await actions();
    expect(liste.aValider).toMatchObject([
      { articleId: a, type: "baisse", etat: "a_valider", prixAvant: 1100, prixApres: 1000, essai: true },
    ]);
    expect((await requete("GET", "/api/alertes")).json<{ aValider: number }>().aValider).toBe(1);
    // Nouveau passage 5 minutes plus tard : rien de plus (fréquence : 1 fois par jour).
    t.horloge.avancer(5 * 60_000);
    await passage();
    expect((await actions()).aValider).toHaveLength(1);
    const id = liste.aValider[0]?.id ?? "";
    expect((await requete("POST", "/api/taches/actions/appliquer", { ids: [id] })).json()).toEqual({ nombre: 1 });
    expect(await actions()).toMatchObject({ aValider: [], journal: [{ id, etat: "en_attente" }] });
  });

  it("« Refuser » ; une action devenue sans objet (prix changé à la main) est annulée", async () => {
    const a = await enLigne();
    const b = await enLigne();
    await reglerTache();
    t.horloge.avancer(8 * JOUR_MS);
    await passage();
    const [x, y] = (await actions()).aValider;
    const refus = await requete("POST", "/api/taches/actions/refuser", { ids: [x?.articleId === a ? x.id : y?.id] });
    expect(refus.json()).toEqual({ nombre: 1 });
    await t.base.update(article).set({ prixAffiche: 900 }).where(eq(article.id, b));
    const apres = await actions();
    expect(apres.aValider).toEqual([]);
    expect(apres.journal.map((l) => [l.articleId, l.etat]).sort()).toEqual(
      [
        [a, "refusee"],
        [b, "annulee"],
      ].sort(),
    );
  });

  it("mode automatique : l'action va directement à l'extension ; « ne pas baisser » → republication", async () => {
    const a = await enLigne({ baisseRegle: "aucune" });
    await reglerTache({ dormantsMode: "automatique" });
    t.horloge.avancer(8 * JOUR_MS);
    await passage();
    expect(await actions()).toMatchObject({
      aValider: [],
      journal: [{ articleId: a, type: "republication", etat: "en_attente", prixApres: null }],
    });
  });

  it("hors de la plage horaire (8 h – 22 h, Paris) : rien", async () => {
    await enLigne();
    await reglerTache();
    t.horloge.avancer(8 * JOUR_MS + 11 * 3_600_000); // 23 h à Paris
    await passage();
    expect((await actions()).aValider).toEqual([]);
  });

  it("3 republications sans vente → Invendu, alerte, puis vendu ou remis En ligne", async () => {
    const a = await enLigne();
    await reglerTache();
    const utilisateurId = (await t.base.select().from(article).where(eq(article.id, a)))[0]?.utilisateurId ?? "";
    t.horloge.avancer(JOUR_MS);
    for (let i = 0; i < 3; i++)
      await t.base.insert(actionVinted).values({
        utilisateurId,
        articleId: a,
        type: "republication",
        etat: "faite",
        prixAvant: 1100,
        essai: false,
        creeLe: t.horloge.maintenant(),
        finLe: t.horloge.maintenant(),
      });
    t.horloge.avancer(8 * JOUR_MS);
    await passage();
    expect((await actions()).aValider).toEqual([]);
    const fiche = (await requete("GET", `/api/articles/${a}`)).json<{
      statut: string;
      transitionsPossibles: string[];
    }>();
    expect(fiche).toMatchObject({
      statut: "invendu",
      transitionsPossibles: ["a_expedier", "en_ligne", "a_publier", "sortie_stock"],
    });
    const alertes = (await requete("GET", "/api/alertes")).json<{ invendus: { id: string }[] }>();
    expect(alertes.invendus.map((x) => x.id)).toEqual([a]);
    // Remis En ligne : le compte des republications repart de zéro, la tâche reprend.
    expect((await requete("POST", `/api/articles/${a}/statut`, { vers: "en_ligne" })).statusCode).toBe(200);
    t.horloge.avancer(8 * JOUR_MS);
    await passage();
    expect((await actions()).aValider).toMatchObject([{ articleId: a, type: "baisse" }]);
  });

  it("un article Invendu peut être vendu (l'annonce reste en ligne)", async () => {
    const a = await enLigne();
    await t.base.update(article).set({ statut: "invendu" }).where(eq(article.id, a));
    const v = await requete("POST", "/api/ventes", { articleIds: [a], montantCredite: 1000 });
    expect(v.statusCode, v.body).toBe(201);
  });

  it("réglages : limites contre le spam et cohérence", async () => {
    expect((await requete("PUT", "/api/reglages", { dormantsFrequenceHeures: 5 })).statusCode).toBe(400);
    expect((await requete("PUT", "/api/reglages", { dormantsPauseRepublication: 300 })).statusCode).toBe(400);
    expect((await requete("PUT", "/api/reglages", { dormantsPlafondBaisses: 41 })).statusCode).toBe(400);
    expect((await requete("PUT", "/api/reglages", { tachesHeureDebut: 22, tachesHeureFin: 8 })).statusCode).toBe(400);
    expect((await requete("PUT", "/api/reglages", { dormantsBaisseValeur: 95 })).statusCode).toBe(400);
    const ok = await requete("PUT", "/api/reglages", { dormantsBaisseType: "montant", dormantsBaisseValeur: 150 });
    expect(ok.json()).toMatchObject({
      dormantsBaisseType: "montant",
      dormantsBaisseValeur: 150,
      dormantsActive: false,
    });
  });

  it("règle de baisse de l'article : enregistrée, valeur obligatoire pour un pourcentage ou un montant", async () => {
    const a = await enLigne({ baisseRegle: "montant", baisseValeur: 200 });
    expect((await requete("GET", `/api/articles/${a}`)).json()).toMatchObject({
      baisseRegle: "montant",
      baisseValeur: 200,
    });
    const refus = await requete("POST", "/api/articles", {
      nom: "X",
      lieuId: t.lieuId,
      prixAchat: 100,
      dateAchat: "2026-09-01",
      categorie: "hommes/vetements/jeans/jeans-coupe-droite",
      marqueId: t.marqueId,
      etat: "bon_etat",
      baisseRegle: "pourcentage",
    });
    expect(refus.statusCode).toBe(400);
  });
});
