// Parcours 9 (#286) : plusieurs brouillons cochés dans la liste, mis à la corbeille d'un coup, puis restaurés d'un coup.
import { describe, expect, test } from "vitest";
import { creerAchat, preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Corbeille en lot", () => {
  test("2 articles cochés → corbeille → restaurés ensemble", async () => {
    const { page } = parcours;
    await creerAchat(page, { prixTotal: 900, nombre: 3 });
    await page.goto("/articles");
    await page.getByRole("button", { name: "Sélectionner pour supprimer" }).click();
    await page.getByRole("checkbox", { name: "Sélectionner #0001" }).check();
    await page.getByRole("checkbox", { name: "Sélectionner #0002" }).check();
    await page.getByRole("button", { name: "Mettre à la corbeille (2)" }).click();
    await page.getByRole("button", { name: "Mettre à la corbeille", exact: true }).click();
    await page.getByText("2 articles mis à la corbeille").waitFor();
    await expect.poll(() => page.getByRole("checkbox", { name: /^Sélectionner #/ }).count()).toBe(0);
    expect(await page.getByText("1 article", { exact: true }).count()).toBe(1);

    await page.goto("/corbeille");
    await page.getByRole("button", { name: "Tout cocher" }).click();
    await page.getByRole("button", { name: "Restaurer (2)" }).click();
    await page.getByRole("status").filter({ hasText: "2 articles restaurés" }).waitFor();
    await page.getByText("La corbeille est vide.").waitFor();
  });
});
