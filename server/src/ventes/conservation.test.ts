// Conservation des données liées aux acheteurs (issue #216) : lien de la conversation et commandes Vinted effacés
// 6 mois après la finalisation ; la vente et ses montants restent.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { article, commandeVinted, reglages, utilisateur, vente } from "../base/schema.js";
import { recevoirCommandes } from "../taches/finalisation.js";
import { creerAppDeTest, seConnecter } from "../test/outils.js";
import { limiteConservation, purgerDonneesAcheteurs } from "./conservation.js";

const MAINTENANT = new Date("2026-10-05T10:00:00.000Z");
const CONVERSATION = "https://www.vinted.fr/inbox/123";

describe("conservation des données des acheteurs", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>>;
  let cookie: string;
  let utilisateurId: string;

  beforeEach(async () => {
    t = await creerAppDeTest();
    cookie = await seConnecter(t.app);
    const [u] = await t.base.select({ id: utilisateur.id }).from(utilisateur);
    utilisateurId = u?.id ?? "";
  });
  afterEach(() => t.fermer());

  const requete = (url: string, payload: object) => t.app.inject({ method: "POST", url, headers: { cookie }, payload });

  /** Article vendu avec un lien de conversation, envoyé puis finalisé à la date donnée ; renvoie l'article. */
  async function venduFinalise(finalisation: string) {
    const refs = (await t.app.inject({ method: "GET", url: "/api/referentiels", headers: { cookie } })).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    const id = (
      await requete("/api/articles", {
        nom: "Jean",
        lieuId: refs.lieux[0]?.id,
        prixAchat: 200,
        dateAchat: "2026-01-10",
        categorie: "hommes/vetements/jeans/jeans-coupe-droite",
        marqueId: refs.marques[0]?.id,
        etat: "bon_etat",
        prixAffiche: 1000,
      })
    ).json<{ id: string }>().id;
    await requete(`/api/articles/${id}/statut`, { vers: "en_ligne", date: "2026-01-11T10:00:00.000Z" });
    const v = (
      await requete("/api/ventes", {
        articleIds: [id],
        montantCredite: 900,
        date: "2026-01-12T10:00:00.000Z",
        urlConversation: CONVERSATION,
      })
    ).json<{ id: string }>();
    expect((await requete(`/api/ventes/${v.id}/envoi`, { date: "2026-01-13T10:00:00.000Z" })).statusCode).toBe(200);
    expect((await requete(`/api/ventes/${v.id}/finalisation`, { date: finalisation })).statusCode).toBe(200);
    return { id, venteId: v.id };
  }
  const lien = async (id: string) =>
    (await t.base.select({ url: article.urlConversation }).from(article).where(eq(article.id, id)))[0]?.url;

  it("limite : 6 mois avant aujourd'hui", () => {
    expect(limiteConservation(MAINTENANT).toISOString()).toBe("2026-04-05T10:00:00.000Z");
  });

  it("efface le lien de conversation d'une vente finalisée depuis plus de 6 mois, garde les plus récentes", async () => {
    const ancien = await venduFinalise("2026-03-01T10:00:00.000Z");
    const recent = await venduFinalise("2026-09-01T10:00:00.000Z");

    expect(await purgerDonneesAcheteurs(t.base, MAINTENANT)).toEqual({ conversations: 1, commandes: 0 });
    expect(await lien(ancien.id)).toBeNull();
    expect(await lien(recent.id)).toBe(CONVERSATION);
    // La vente et son montant restent.
    const [v] = await t.base.select().from(vente).where(eq(vente.id, ancien.venteId));
    expect(v?.montantCredite).toBe(900);
  });

  it("supprime les commandes Vinted terminées depuis plus de 6 mois, sans jamais les relire", async () => {
    const commande = (idCommande: string, dateFin: string) => ({
      utilisateurId,
      idCommande,
      annonces: ["111"],
      dateFin: new Date(dateFin),
      etat: "a_rattacher" as const,
      creeLe: MAINTENANT,
    });
    await t.base
      .insert(commandeVinted)
      .values([commande("ANCIENNE", "2026-03-01T10:00:00.000Z"), commande("RECENTE", "2026-09-01T10:00:00.000Z")]);

    expect(await purgerDonneesAcheteurs(t.base, MAINTENANT)).toEqual({ conversations: 0, commandes: 1 });
    const restantes = await t.base.select({ id: commandeVinted.idCommande }).from(commandeVinted);
    expect(restantes.map((c) => c.id)).toEqual(["RECENTE"]);

    // Relue plus tard sur Vinted, une commande trop ancienne est ignorée.
    await t.base.update(reglages).set({ tachesEssai: false }).where(eq(reglages.utilisateurId, utilisateurId));
    const lue = {
      idCommande: "ANCIENNE",
      annonces: ["111"],
      dateFin: new Date("2026-03-01T10:00:00.000Z"),
      montant: null,
    };
    expect(await recevoirCommandes(t.base, utilisateurId, { essai: false, commandes: [lue] }, MAINTENANT)).toEqual({
      nouvelles: 0,
    });
    expect(await t.base.select().from(commandeVinted)).toHaveLength(1);
  });
});
