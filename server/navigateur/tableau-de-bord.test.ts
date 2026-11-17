// Parcours 4 (#243) : le tableau de bord affiche les montants calculés par le serveur (aucun calcul dans l'écran).
import { describe, expect, test } from "vitest";
import { creerAchat, mettreEnLigne, preparerParcours, vendreEtFinaliser } from "./outils.js";

const parcours = preparerParcours();

const euros = (centimes: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(centimes / 100);
const espaces = (texte: string) => texte.replace(/\s+/g, " ");

interface Tableau {
  duMois: { chiffreAffaires: number; beneficeRealise: number; tresorerie: number };
}

describe("Tableau de bord", () => {
  test("chiffre d'affaires, bénéfice et trésorerie du mois = calculs du serveur", async () => {
    const { page } = parcours;
    // Lot de 2 articles pour 4 €, vendus ensemble 12 € avec 0,08 € d'emballage.
    const ids = await creerAchat(page, { prixTotal: 400, nombre: 2 });
    for (const id of ids) await mettreEnLigne(page, id, 800);
    await vendreEtFinaliser(page, ids, 1200, 8);

    await page.goto("/tableau");
    const tuile = (nom: string) => page.getByRole("group", { name: nom, exact: true });
    await tuile("Chiffre d'affaires").waitFor();

    const serveur = (await (await page.request.get("/api/tableau-de-bord")).json()) as Tableau;
    expect(serveur.duMois.chiffreAffaires).toBe(1200);
    expect(serveur.duMois.beneficeRealise).toBe(1200 - 400 - 8);
    for (const [nom, centimes] of [
      ["Chiffre d'affaires", serveur.duMois.chiffreAffaires],
      ["Bénéfice réalisé", serveur.duMois.beneficeRealise],
      ["Trésorerie", serveur.duMois.tresorerie],
    ] as const) {
      const valeur = tuile(nom).locator(".tuile__valeur");
      expect(espaces(await valeur.innerText()), nom).toBe(espaces(euros(centimes)));
    }
  });
});
