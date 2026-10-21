// Refonte des tâches automatisées (#232, #233) : plage horaire et mode essai par tâche, état de chaque tâche, journal
// de toutes les tâches (filtres, raison des erreurs) et sa conservation de 3 mois.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { actionVinted, lectureCommandes, utilisateur } from "../base/schema.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { purgerJournalTaches } from "./journal.js";

interface LigneJournal {
  id: string;
  tache: "dormants" | "finalisation";
  etat: string;
  date: string;
  message: string | null;
  releve: boolean;
  essai: boolean;
}

const JOUR_MS = 86_400_000;

describe("refonte des tâches (#232, #233)", () => {
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
  const passage = async () =>
    (await programme("GET", "/api/programme/attente")).json<{ actions: number; lectureCommandes: boolean }>();
  const suivante = async () =>
    (await programme("GET", "/api/programme/action-suivante")).json<{ action: { id: string; essai: boolean } | null }>()
      .action;
  const journal = async (filtres = "") =>
    (await requete("GET", `/api/taches/journal${filtres}`)).json<{ lignes: LigneJournal[] }>().lignes;
  const etat = async () => (await requete("GET", "/api/taches/etat")).json();

  /** Article En ligne à 11 €, minimum 5 €, avec le lien de son annonce. */
  async function enLigne() {
    const id = (
      await requete("POST", "/api/articles", {
        nom: "Jean",
        lieuId: t.lieuId,
        prixAchat: 200,
        dateAchat: "2026-09-01",
        categorie: "hommes/vetements/jeans/jeans-coupe-droite",
        marqueId: t.marqueId,
        etat: "bon_etat",
        prixAffiche: 1100,
        prixVenteMinimum: 500,
      })
    ).json<{ id: string }>().id;
    await requete("POST", `/api/articles/${id}/statut`, { vers: "en_ligne" });
    await requete("PUT", `/api/articles/${id}/lien-vinted`, { url: "https://www.vinted.fr/items/123-jean" });
    return id;
  }

  it("plage horaire et mode essai propres à chaque tâche", async () => {
    await enLigne();
    const r = await requete("PUT", "/api/reglages", {
      dormantsActive: true,
      dormantsMode: "automatique",
      dormantsHeureDebut: 14,
      dormantsHeureFin: 22,
      finalisationActive: true,
    });
    expect(r.json()).toMatchObject({ dormantsEssai: true, finalisationEssai: true, finalisationHeureDebut: 8 });
    t.horloge.avancer(8 * JOUR_MS); // midi à Paris : hors de la plage des dormants, dans celle des ventes
    expect(await passage()).toMatchObject({ actions: 0, lectureCommandes: true });
    await requete("PUT", "/api/reglages", { dormantsEssai: false });
    t.horloge.avancer(2 * 3_600_000); // 14 h
    expect((await passage()).actions).toBe(1);
    expect((await suivante())?.essai).toBe(false);
    // Ventes finalisées toujours en essai : la lecture est notée, aucune commande enregistrée.
    const commande = { idCommande: "C1", annonces: ["123"], dateFin: "2026-10-12T10:00:00.000Z" };
    expect(
      (await programme("POST", "/api/programme/commandes", { essai: false, commandes: [commande] })).json(),
    ).toEqual({ nouvelles: 0 });
    expect((await requete("GET", "/api/taches/commandes")).json()).toMatchObject({ aValider: [], aRattacher: [] });
    expect(await journal("?tache=finalisation")).toMatchObject([{ etat: "essai", essai: true }]);
    // Chaque plage est vérifiée.
    const inverse = await requete("PUT", "/api/reglages", { finalisationHeureDebut: 22, finalisationHeureFin: 8 });
    expect(inverse.statusCode).toBe(400);
    expect(
      (await requete("PUT", "/api/reglages", { finalisationHeureDebut: 23, finalisationHeureFin: 24 })).statusCode,
    ).toBe(200);
  });

  it("journal de toutes les tâches : raison des erreurs, relevé, filtres par tâche, état et jour", async () => {
    await enLigne();
    await requete("PUT", "/api/reglages", { dormantsActive: true, dormantsMode: "automatique" });
    t.horloge.avancer(8 * JOUR_MS);
    await passage();
    const x = await suivante();
    const erreur = { resultat: "erreur", message: "Bouton « Modifier » introuvable.", releve: true };
    expect((await programme("POST", `/api/programme/actions/${x?.id}/resultat`, erreur)).statusCode).toBe(200);
    t.horloge.avancer(60_000);
    const lecture = { essai: true, commandes: [], erreur: "Page « Porte-monnaie » introuvable.", releve: true };
    expect((await programme("POST", "/api/programme/commandes", lecture)).statusCode).toBe(200);
    t.horloge.avancer(60_000);
    await programme("POST", "/api/programme/commandes", { essai: true, commandes: [] });

    expect(await journal()).toMatchObject([
      { tache: "finalisation", etat: "essai", message: null, releve: false },
      { tache: "finalisation", etat: "erreur", message: "Page « Porte-monnaie » introuvable.", releve: true },
      { tache: "dormants", etat: "erreur", message: "Bouton « Modifier » introuvable.", releve: true },
    ]);
    expect(await journal("?tache=dormants")).toHaveLength(1);
    expect(await journal("?etat=erreur")).toHaveLength(2);
    expect(await journal("?tache=finalisation&etat=erreur")).toHaveLength(1);
    expect(await journal("?jour=2026-10-13")).toHaveLength(3);
    expect(await journal("?jour=2026-10-12")).toEqual([]);
    expect((await requete("GET", "/api/taches/journal?tache=autre")).statusCode).toBe(400);
    expect((await requete("GET", "/api/taches/journal?jour=13/10/2026")).statusCode).toBe(400);
    // Les actions du jour comptent pour l'état de la tâche.
    expect(await etat()).toMatchObject({ dormants: { aujourdhui: { baisses: 1, republications: 0 } } });
  });

  it("lecture des ventes en erreur : la demande s'efface et la lecture attend sa fréquence", async () => {
    await requete("PUT", "/api/reglages", { finalisationActive: true });
    expect((await passage()).lectureCommandes).toBe(true);
    await programme("POST", "/api/programme/commandes", { essai: true, commandes: [], erreur: "Session expirée." });
    expect((await passage()).lectureCommandes).toBe(false);
    await requete("POST", "/api/taches/finalisation/lancer");
    expect((await passage()).lectureCommandes).toBe(true);
    await programme("POST", "/api/programme/commandes", { essai: true, commandes: [], erreur: "Session expirée." });
    expect((await passage()).lectureCommandes).toBe(false);
    expect(await journal()).toMatchObject([
      { etat: "erreur", manuelle: true },
      { etat: "erreur", manuelle: false },
    ]);
    t.horloge.avancer(JOUR_MS);
    expect((await passage()).lectureCommandes).toBe(true);
  });

  it("état de chaque tâche : activée, essai, dernier et prochain passage, actions du jour et plafonds", async () => {
    expect(await etat()).toEqual({
      dormants: {
        active: false,
        essai: true,
        dernierPassage: null,
        prochainPassage: null,
        aujourdhui: { baisses: 0, republications: 0, plafondBaisses: 20, plafondRepublications: 10 },
      },
      finalisation: {
        active: false,
        essai: true,
        dernierPassage: null,
        prochainPassage: null,
        lancementDemande: null,
        aujourdhui: { finalisees: 0, plafond: 50 },
      },
    });
    await requete("PUT", "/api/reglages", {
      dormantsActive: true,
      dormantsFrequenceHeures: 12,
      finalisationActive: true,
    });
    expect(await etat()).toMatchObject({
      dormants: { prochainPassage: "2026-10-05T10:00:00.000Z" },
      finalisation: { prochainPassage: "2026-10-05T10:00:00.000Z" },
    });
    await passage(); // à midi à Paris ; 12 h plus tard il est minuit : prochain passage à 8 h
    await requete("POST", "/api/taches/finalisation/lancer");
    expect(await etat()).toMatchObject({
      dormants: { dernierPassage: "2026-10-05T10:00:00.000Z", prochainPassage: "2026-10-06T06:00:00.000Z" },
      finalisation: { lancementDemande: "2026-10-05T10:00:00.000Z" },
    });
  });

  it("conservation : lignes de plus de 3 mois effacées, sauf les republications faites (comptées pour Invendu)", async () => {
    const articleId = await enLigne();
    const [u] = await t.base.select({ id: utilisateur.id }).from(utilisateur);
    const utilisateurId = u?.id ?? "";
    const vieux = new Date("2026-06-01T10:00:00.000Z");
    const recent = new Date("2026-09-20T10:00:00.000Z");
    const action = { utilisateurId, articleId, prixAvant: 1100, creeLe: vieux, finLe: vieux };
    await t.base.insert(actionVinted).values([
      { ...action, type: "baisse", etat: "erreur" },
      { ...action, type: "republication", etat: "faite" },
      { ...action, type: "baisse", etat: "essai", creeLe: recent, finLe: recent },
    ]);
    await t.base.insert(lectureCommandes).values([
      { utilisateurId, date: vieux, essai: true },
      { utilisateurId, date: new Date("2026-09-21T10:00:00.000Z"), essai: true },
    ]);
    expect(await purgerJournalTaches(t.base, t.horloge.maintenant())).toEqual({ actions: 1, lectures: 1 });
    const restantes = await t.base.select().from(actionVinted).where(eq(actionVinted.utilisateurId, utilisateurId));
    expect(restantes.map((a) => `${a.type} ${a.etat}`).sort()).toEqual(["baisse essai", "republication faite"]);
    // La republication gardée n'est plus montrée dans le journal.
    expect((await journal()).map((l) => `${l.tache} ${l.etat}`)).toEqual(["finalisation essai", "dormants essai"]);
  });
});
