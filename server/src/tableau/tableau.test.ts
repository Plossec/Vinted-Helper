// Tableau de bord par l'API (lot 5) — critères du §8.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerAppDeTest, seConnecter } from "../test/outils.js";

interface Tableau {
  duMois: { chiffreAffaires: number; beneficeRealise: number; tresorerie: number };
  deLAnnee: { chiffreAffaires: number };
  serie: { mois: string; chiffreAffaires: number }[];
  stock: { coutTotal: number; prixAffiche: number; parStatut: Record<string, number> };
  rentabiliteLieux: { classement: { libelle: string; realise: number }[] };
  analyse: { categories: { libelle: string; nombreVendus: number }[] };
}

describe("tableau de bord", () => {
  let t: Awaited<ReturnType<typeof creerAppDeTest>> & { cookie: string };
  beforeEach(async () => {
    const base = await creerAppDeTest();
    t = { ...base, cookie: await seConnecter(base.app) };
  });
  afterEach(() => t.fermer());

  const requete = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: t.cookie }, ...(payload ? { payload } : {}) });

  it("§8 — vendu le 30/09, finalisé le 04/10 → CA d'octobre ; frais divers du 10/10 → −3 € en octobre", async () => {
    const refs = (await requete("GET", "/api/referentiels")).json<{
      lieux: { id: string; nom: string }[];
      marques: { id: string }[];
    }>();
    const cree = await requete("POST", "/api/articles", {
      nom: "Jean",
      lieuId: refs.lieux.find((l) => l.nom === "Vide grenier")?.id,
      prixAchat: 200,
      dateAchat: "2026-09-01",
      categorie: "hommes/vetements/jeans/jeans-droits",
      marqueId: refs.marques[0]?.id,
      etat: "bon_etat",
    });
    const id = cree.json<{ id: string }>().id;
    await requete("POST", `/api/articles/${id}/statut`, {
      vers: "en_ligne",
      prixAffiche: 900,
      date: "2026-09-10T10:00:00Z",
    });
    const vente = (
      await requete("POST", "/api/ventes", { articleIds: [id], montantCredite: 900, date: "2026-09-30T18:00:00Z" })
    ).json<{ id: string }>();
    await requete("POST", `/api/ventes/${vente.id}/envoi`, { date: "2026-10-01T09:00:00Z" });
    await requete("POST", `/api/ventes/${vente.id}/finalisation`, { date: "2026-10-04T09:00:00Z" });

    let tableau = (await requete("GET", "/api/tableau-de-bord?annee=2026&mois=10")).json<Tableau>();
    expect(tableau.duMois).toMatchObject({ chiffreAffaires: 900, beneficeRealise: 692, tresorerie: 892 });
    expect(tableau.serie.find((m) => m.mois === "2026-09")?.chiffreAffaires).toBe(0);
    expect(tableau.rentabiliteLieux.classement).toEqual([
      expect.objectContaining({ libelle: "Vide grenier", realise: 692 }),
    ]);
    expect(tableau.analyse.categories).toEqual([
      expect.objectContaining({ libelle: "Hommes › Vêtements › Jeans", nombreVendus: 1 }),
    ]);

    await requete("POST", "/api/frais", { date: "2026-10-10", montant: 300, libelle: "Étiquettes" });
    tableau = (await requete("GET", "/api/tableau-de-bord?annee=2026&mois=10")).json<Tableau>();
    expect(tableau.duMois).toMatchObject({ beneficeRealise: 392, tresorerie: 592 });
    expect(tableau.deLAnnee.chiffreAffaires).toBe(900);
  });

  it("valeur du stock et nombre d'articles par statut", async () => {
    const refs = (await requete("GET", "/api/referentiels")).json<{
      lieux: { id: string }[];
      marques: { id: string }[];
    }>();
    for (const prixAchat of [100, 250]) {
      await requete("POST", "/api/articles", {
        nom: "Pull",
        lieuId: refs.lieux[0]?.id,
        prixAchat,
        dateAchat: "2026-10-01",
        categorie: "hommes/vetements/jeans/jeans-droits",
        marqueId: refs.marques[0]?.id,
        etat: "bon_etat",
      });
    }
    const tableau = (await requete("GET", "/api/tableau-de-bord")).json<Tableau>();
    expect(tableau.stock).toEqual({ coutTotal: 350, prixAffiche: 0, parStatut: { brouillon: 2 } });
  });
});
