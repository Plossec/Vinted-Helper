// Tâche « Vérification vente finalisée » (#148) : commandes terminées lues sur Vinted → colis « Finalisé ».
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

interface CommandeListee {
  id: string;
  idCommande: string;
  etat: string;
  montant: number | null;
  montantAvant: number | null;
  message: string | null;
  vente: { id: string; montantCredite: number | null; articles: { id: string }[] } | null;
}
interface Liste {
  aValider: CommandeListee[];
  aRattacher: CommandeListee[];
  montantsCorriges: CommandeListee[];
  journal: CommandeListee[];
}

const JOUR_MS = 86_400_000;

describe("tâche « Vérification vente finalisée »", () => {
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
  const programme = (method: "GET" | "POST", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { authorization: `Bearer ${t.jeton}` }, ...(payload ? { payload } : {}) });
  const liste = async () => (await requete("GET", "/api/taches/commandes")).json<Liste>();
  const lire = async (id: string) =>
    (await requete("GET", `/api/articles/${id}`)).json<{ statut: string; urlVinted: string | null }>();
  const envoyer = (commandes: object[], essai = false) =>
    programme("POST", "/api/programme/commandes", { essai, commandes });
  const regler = (extra: object = {}) =>
    requete("PUT", "/api/reglages", { finalisationActive: true, finalisationEssai: false, ...extra });

  /** Article En ligne (annonce n° `annonce`), vendu et envoyé ; renvoie l'article et sa vente. */
  async function envoye(annonce: string | null, prix = 1000) {
    const id = (
      await requete("POST", "/api/articles", {
        nom: "Jean",
        lieuId: t.lieuId,
        prixAchat: 200,
        dateAchat: "2026-09-01",
        categorie: "hommes/vetements/jeans/jeans-coupe-droite",
        marqueId: t.marqueId,
        etat: "bon_etat",
        prixAffiche: prix,
      })
    ).json<{ id: string }>().id;
    await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne" });
    if (annonce)
      await requete("PUT", `/api/articles/${id}/lien-vinted`, { url: `https://www.vinted.fr/items/${annonce}-jean` });
    return id;
  }
  async function colis(ids: string[], montant: number) {
    const v = (await requete("POST", "/api/ventes", { articleIds: ids, montantCredite: montant })).json<{
      id: string;
    }>();
    expect((await requete("POST", `/api/ventes/${v.id}/envoi`, {})).statusCode).toBe(200);
    return v.id;
  }
  const commande = (idCommande: string, annonces: string[], montant: number | null = 1000) => ({
    idCommande,
    annonces,
    dateFin: new Date(t.horloge.maintenant().getTime() - 3_600_000).toISOString(),
    montant,
  });

  it("« Lancer maintenant » (#230) : lecture due à toute heure, même désactivée, une seule fois", async () => {
    const attente = async () =>
      (await programme("GET", "/api/programme/attente")).json<{ lectureCommandes: boolean }>().lectureCommandes;
    t.horloge.avancer(11 * 3_600_000); // 23 h à Paris, tâche désactivée
    expect(await attente()).toBe(false);
    const r = await requete("POST", "/api/taches/finalisation/lancer");
    expect(r.statusCode).toBe(200);
    expect(await attente()).toBe(true);
    await envoyer([], true); // lecture faite (essai)
    expect(await attente()).toBe(false);
  });

  it("lecture due au passage de l'extension une fois activée ; en essai, rien n'est enregistré", async () => {
    const a = await envoye("111");
    await colis([a], 1000);
    const attente = async () =>
      (await programme("GET", "/api/programme/attente")).json<{ lectureCommandes: boolean }>().lectureCommandes;
    expect(await attente()).toBe(false); // désactivée par défaut
    await requete("PUT", "/api/reglages", { finalisationActive: true }); // mode essai des tâches : coché par défaut
    expect(await attente()).toBe(true);
    expect((await envoyer([commande("C1", ["111"])], false)).json()).toEqual({ nouvelles: 0 });
    expect(await attente()).toBe(false); // lue : prochaine lecture dans 24 h
    expect(await liste()).toMatchObject({ aValider: [], aRattacher: [] });
    expect((await lire(a)).statut).toBe("envoye");
    t.horloge.avancer(JOUR_MS);
    expect(await attente()).toBe(true);
  });

  it("mode manuel : à valider, puis « Appliquer » : Finalisé à la date de Vinted, montant corrigé et signalé", async () => {
    const a = await envoye("111");
    const v = await colis([a], 1000);
    await regler();
    expect((await envoyer([commande("C1", ["111"], 950)])).json()).toEqual({ nouvelles: 1 });
    expect((await envoyer([commande("C1", ["111"], 950)])).json()).toEqual({ nouvelles: 0 }); // déjà lue
    const { aValider } = await liste();
    expect(aValider).toMatchObject([{ idCommande: "C1", montant: 950, vente: { id: v, montantCredite: 1000 } }]);
    expect((await requete("GET", "/api/alertes")).json()).toMatchObject({
      commandes: { aValider: 1, aRattacher: 0, montantsCorriges: 0 },
    });
    expect((await lire(a)).statut).toBe("envoye");
    const r = await requete("POST", "/api/taches/commandes/appliquer", { ids: [aValider[0]?.id] });
    expect(r.json()).toEqual({ nombre: 1 });
    expect((await lire(a)).statut).toBe("finalise");
    const vente = (await requete("GET", `/api/ventes/${v}`)).json<{
      montantCredite: number;
      dateFinalisation: string;
    }>();
    expect(vente.montantCredite).toBe(950);
    expect(vente.dateFinalisation).toBe(new Date(t.horloge.maintenant().getTime() - 3_600_000).toISOString());
    const corrige = (await liste()).montantsCorriges;
    expect(corrige).toMatchObject([{ montant: 950, montantAvant: 1000 }]);
    await requete("POST", `/api/taches/commandes/${corrige[0]?.id}/vu`, {});
    expect((await liste()).montantsCorriges).toEqual([]);
  });

  it("mode automatique : finalisé tout de suite ; vente groupée : tout le colis ; colis différent → à rattacher", async () => {
    const a = await envoye("111");
    const b = await envoye("222");
    const c = await envoye("333");
    const d = await envoye("444");
    await colis([a, b], 1500);
    await colis([c, d], 1500);
    await regler({ finalisationMode: "automatique" });
    await envoyer([commande("G1", ["111", "222"], 1500), commande("G2", ["333"], 700)]);
    expect([(await lire(a)).statut, (await lire(b)).statut]).toEqual(["finalise", "finalise"]);
    expect([(await lire(c)).statut, (await lire(d)).statut]).toEqual(["envoye", "envoye"]);
    expect((await liste()).aRattacher).toMatchObject([
      {
        idCommande: "G2",
        message: "Le colis de l'application ne contient pas les mêmes articles que la commande Vinted.",
      },
    ]);
    expect((await liste()).montantsCorriges).toEqual([]); // même montant : rien à signaler
  });

  it("commande non retrouvée → à rattacher ; « Rattacher » enregistre le lien et finalise ; « Ignorer »", async () => {
    const a = await envoye(null);
    await colis([a], 1000);
    await regler({ finalisationMode: "automatique" });
    await envoyer([commande("R1", ["999"]), commande("R2", ["888"])]);
    const { aRattacher } = await liste();
    expect(aRattacher.map((x) => x.message)).toEqual([
      "Aucun article Envoyé ne porte le lien de cette annonce.",
      "Aucun article Envoyé ne porte le lien de cette annonce.",
    ]);
    const r1 = aRattacher.find((x) => x.idCommande === "R1");
    const r2 = aRattacher.find((x) => x.idCommande === "R2");
    expect((await requete("POST", `/api/taches/commandes/${r1?.id}/rattacher`, { articleId: a })).statusCode).toBe(200);
    expect(await lire(a)).toMatchObject({ statut: "finalise", urlVinted: "https://www.vinted.fr/items/999" });
    expect((await requete("POST", "/api/taches/commandes/ecarter", { ids: [r2?.id] })).json()).toEqual({ nombre: 1 });
    const fin = await liste();
    expect(fin.aRattacher).toEqual([]);
    expect(fin.journal.map((x) => [x.idCommande, x.etat]).sort()).toEqual([
      ["R1", "appliquee"],
      ["R2", "ignoree"],
    ]);
  });

  it("commande mal formée : refusée", async () => {
    await regler();
    expect((await envoyer([{ idCommande: "X", annonces: ["abc"], dateFin: "2026-10-01" }])).statusCode).toBe(400);
    expect((await envoyer([{ idCommande: "X", annonces: ["1"], dateFin: "hier" }])).statusCode).toBe(400);
    expect(
      (await envoyer([{ idCommande: "X", annonces: ["1"], dateFin: "2026-10-01", montant: 9.5 }])).statusCode,
    ).toBe(400);
  });
});
