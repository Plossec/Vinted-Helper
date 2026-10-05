// Articles : référence, fiche, statuts et historiques — cahier des charges §4, §5.2, critères du §8.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { article, historiquePrix } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

type Contexte = Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string; lieuId: string; maisonId: string };

async function preparer(): Promise<Contexte> {
  const t = await creerAppDeTest();
  const cookie = await seConnecter(t.app);
  const refs = (await t.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
    lieux: { id: string; nom: string; estMaison: boolean }[];
  }>();
  const lieuId = refs.lieux.find((l) => l.nom === "Vide grenier")?.id ?? "";
  const maisonId = refs.lieux.find((l) => l.estMaison)?.id ?? "";
  return { ...t, cookie, lieuId, maisonId };
}

const ficheMinimale = (lieuId: string, ajouts: Record<string, unknown> = {}) => ({
  nom: "Jean Levi's 501",
  lieuId,
  prixAchat: 300,
  dateAchat: "2026-10-04",
  ...ajouts,
});

describe("articles", () => {
  let t: Contexte;
  beforeEach(async () => {
    t = await preparer();
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });
  const creer = async (ajouts: Record<string, unknown> = {}) => {
    const reponse = await requete("POST", "/api/articles", ficheMinimale(t.lieuId, ajouts));
    expect(reponse.statusCode).toBe(201);
    return reponse.json<{ id: string; reference: number; statut: string; transitionsPossibles: string[] }>();
  };

  describe("référence automatique", () => {
    it("#0001 puis #0002, par utilisateur", async () => {
      expect((await creer()).reference).toBe(1);
      expect((await creer()).reference).toBe(2);
    });

    it("§8 — un numéro supprimé définitivement n'est jamais réutilisé", async () => {
      await creer();
      const deuxieme = await creer();
      await t.base.delete(article).where(eq(article.id, deuxieme.id)); // suppression définitive (interface : lot 4)
      expect((await creer()).reference).toBe(3);
    });
  });

  describe("fiche", () => {
    it("création : nom, lieu, prix d'achat et date d'achat sont obligatoires", async () => {
      for (const champ of ["nom", "lieuId", "prixAchat", "dateAchat"]) {
        const fiche = Object.fromEntries(Object.entries(ficheMinimale(t.lieuId)).filter(([cle]) => cle !== champ));
        const reponse = await requete("POST", "/api/articles", fiche);
        expect(reponse.statusCode, champ).toBe(400);
        expect(reponse.json<{ erreur: string }>().erreur).toMatch(/obligatoire/);
      }
    });

    it("un article neuf est en Brouillon, avec son historique", async () => {
      const cree = await creer();
      const fiche = (await requete("GET", `/api/articles/${cree.id}`)).json<{
        statut: string;
        historiqueStatuts: { de: string | null; vers: string; date: string }[];
      }>();
      expect(fiche.statut).toBe("brouillon");
      expect(fiche.historiqueStatuts).toEqual([
        expect.objectContaining({ de: null, vers: "brouillon", date: "2026-10-05T10:00:00.000Z" }),
      ]);
    });

    it("les montants sont en centimes entiers (un montant à virgule est refusé)", async () => {
      const reponse = await requete("POST", "/api/articles", ficheMinimale(t.lieuId, { prixAchat: 3.5 }));
      expect(reponse.statusCode).toBe(400);
    });

    it("une valeur de liste d'un autre utilisateur ou inconnue est refusée", async () => {
      const reponse = await requete("POST", "/api/articles", ficheMinimale("00000000-0000-4000-8000-000000000000"));
      expect(reponse.json()).toEqual({ erreur: "Lieu inconnu(e)." });
    });

    it("modification de la fiche", async () => {
      const cree = await creer();
      const reponse = await requete(
        "PUT",
        `/api/articles/${cree.id}`,
        ficheMinimale(t.maisonId, { nom: "Polo", prixAchat: 0, taille: "M" }),
      );
      expect(reponse.json()).toMatchObject({ nom: "Polo", lieuId: t.maisonId, prixAchat: 0, taille: "M" });
    });

    it("liste simple : la plus récente en premier", async () => {
      await creer({ nom: "Premier" });
      t.horloge.avancer(60_000);
      await creer({ nom: "Second" });
      const liste = (await requete("GET", "/api/articles")).json<{ nom: string; reference: number }[]>();
      expect(liste.map((a) => a.nom)).toEqual(["Second", "Premier"]);
    });
  });

  describe("statuts (§4)", () => {
    const changer = (id: string, corps: object) => requete("POST", `/api/articles/${id}/statut`, corps);

    it("§8 — Brouillon sans prix affiché → En ligne : le prix est demandé", async () => {
      const cree = await creer();
      const refus = await changer(cree.id, { vers: "en_ligne" });
      expect(refus.statusCode).toBe(409);
      expect(refus.json()).toEqual({
        erreur: "Indiquez le prix affiché sur Vinted avant de passer l'article En ligne.",
      });
      const accepte = await changer(cree.id, { vers: "en_ligne", prixAffiche: 900 });
      expect(accepte.json()).toMatchObject({ statut: "en_ligne", prixAffiche: 900 });
    });

    it("§8 — une date modifiée est enregistrée dans l'historique, et corrigeable ensuite", async () => {
      const cree = await creer();
      const veille = "2026-10-04T18:30:00.000Z";
      const fiche = (await changer(cree.id, { vers: "a_publier", date: veille })).json<{
        historiqueStatuts: { id: string; vers: string; date: string }[];
      }>();
      const changement = fiche.historiqueStatuts.find((h) => h.vers === "a_publier");
      expect(changement?.date).toBe(veille);

      const correction = await requete("PUT", `/api/historique-statuts/${changement?.id}`, {
        date: "2026-10-04T09:00:00.000Z",
      });
      expect(correction.statusCode).toBe(200);
      const relu = (await requete("GET", `/api/articles/${cree.id}`)).json<{
        historiqueStatuts: { vers: string; date: string }[];
      }>();
      expect(relu.historiqueStatuts.find((h) => h.vers === "a_publier")?.date).toBe("2026-10-04T09:00:00.000Z");
    });

    it("une date dans le futur est refusée", async () => {
      const cree = await creer();
      const reponse = await changer(cree.id, { vers: "a_publier", date: "2026-10-06T10:00:00.000Z" });
      expect(reponse.json()).toEqual({ erreur: "La date ne peut pas être dans le futur." });
    });

    it("un passage interdit par le §4.2 est refusé", async () => {
      const cree = await creer();
      await changer(cree.id, { vers: "en_ligne", prixAffiche: 900 });
      const reponse = await changer(cree.id, { vers: "brouillon" });
      expect(reponse.json()).toEqual({ erreur: "Passage impossible de « En ligne » à « Brouillon »." });
    });

    it("lot 1 : les passages des lots suivants (vente, sortie du stock) ne sont pas encore disponibles", async () => {
      const cree = await creer();
      await changer(cree.id, { vers: "en_ligne", prixAffiche: 900 });
      const reponse = await changer(cree.id, { vers: "a_expedier" });
      expect(reponse.statusCode).toBe(409);
      expect(reponse.json<{ erreur: string }>().erreur).toMatch(/prochaine version/);
    });

    it("les transitions proposées à l'interface sont celles du lot 1", async () => {
      const cree = await creer();
      expect(cree.transitionsPossibles).toEqual(["a_publier", "en_ligne"]);
      const enLigne = (await changer(cree.id, { vers: "en_ligne", prixAffiche: 900 })).json<{
        transitionsPossibles: string[];
      }>();
      expect(enLigne.transitionsPossibles).toEqual(["a_publier"]);
    });

    it("un article En ligne doit garder un prix affiché", async () => {
      const cree = await creer();
      await changer(cree.id, { vers: "en_ligne", prixAffiche: 900 });
      const reponse = await requete("PUT", `/api/articles/${cree.id}`, ficheMinimale(t.lieuId, { prixAffiche: null }));
      expect(reponse.json()).toEqual({ erreur: "Un article En ligne doit garder un prix affiché." });
    });
  });

  describe("historique du prix affiché (enregistré dès le lot 1)", () => {
    it("chaque saisie ou modification est datée", async () => {
      const cree = await creer({ prixAffiche: 1200 });
      t.horloge.avancer(24 * 3600 * 1000);
      await requete("PUT", `/api/articles/${cree.id}`, ficheMinimale(t.lieuId, { prixAffiche: 1200 })); // inchangé
      await requete("PUT", `/api/articles/${cree.id}`, ficheMinimale(t.lieuId, { prixAffiche: 900 }));
      const prix = await t.base
        .select({ prix: historiquePrix.prix, date: historiquePrix.date })
        .from(historiquePrix)
        .where(eq(historiquePrix.articleId, cree.id))
        .orderBy(historiquePrix.date);
      expect(prix).toEqual([
        { prix: 1200, date: new Date("2026-10-05T10:00:00.000Z") },
        { prix: 900, date: new Date("2026-10-06T10:00:00.000Z") },
      ]);
    });
  });
});

describe("listes de référence", () => {
  let t: Contexte;
  beforeEach(async () => {
    t = await preparer();
  });
  afterEach(() => t.fermer());

  it("ajout à la volée ; une valeur existante (majuscules différentes) n'est pas dupliquée", async () => {
    const ajouter = (nom: string) =>
      t.app.inject({
        method: "POST",
        url: "/api/referentiels/marques",
        headers: { cookie: t.cookie },
        payload: { nom },
      });
    const creee = (await ajouter("Kiabi")).json<{ id: string }>();
    expect((await ajouter("  kiabi ")).json<{ id: string }>().id).toBe(creee.id);
    const levis = (await ajouter("LEVI'S")).json<{ nom: string }>();
    expect(levis.nom).toBe("Levi's");
  });
});
