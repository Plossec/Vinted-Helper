import { describe, expect, it } from "vitest";
import {
  creerStockageMemoire,
  type ElementFile,
  elementsDeLaSortie,
  envoyerFile,
  type Envoyeur,
  interpreterReponse,
  listerDansLOrdre,
  type Operation,
  type ResultatEnvoi,
} from "./file.js";

const essence = (sortieId: string): Operation => ({ type: "essence", sortieId, montantEssence: 200 });
const element = (cle: string, creeLe: number, operation: Operation = essence(cle)): ElementFile => ({
  cle,
  creeLe,
  operation,
  erreur: null,
});

async function fileAvec(...elements: ElementFile[]) {
  const stockage = creerStockageMemoire();
  for (const e of elements) await stockage.ecrire(e);
  return stockage;
}

/** Envoyeur simulé : renvoie les résultats prévus, dans l'ordre, et note les envois. */
function envoyeurSimule(...resultats: ResultatEnvoi[]) {
  const envois: string[] = [];
  const envoyer: Envoyeur = async (op) => {
    envois.push(op.type === "essence" ? op.sortieId : op.type);
    return resultats.shift() ?? { etat: "envoye" };
  };
  return { envoyer, envois };
}

describe("file d'attente hors réseau", () => {
  it("envoie dans l'ordre de création et vide la file", async () => {
    const stockage = await fileAvec(element("b", 2), element("a", 1), element("c", 3));
    const { envoyer, envois } = envoyeurSimule();
    expect(await envoyerFile(stockage, envoyer)).toBe("termine");
    expect(envois).toEqual(["a", "b", "c"]);
    expect(await stockage.lister()).toEqual([]);
  });

  it("§8 — sans réseau : rien n'est perdu, on s'arrête et on réessaie plus tard", async () => {
    const stockage = await fileAvec(element("a", 1), element("b", 2));
    const premier = envoyeurSimule({ etat: "reseau" });
    expect(await envoyerFile(stockage, premier.envoyer)).toBe("reseau");
    expect(premier.envois).toEqual(["a"]);
    expect((await stockage.lister()).map((e) => e.cle).sort()).toEqual(["a", "b"]);
    // Retour du réseau.
    const second = envoyeurSimule();
    expect(await envoyerFile(stockage, second.envoyer)).toBe("termine");
    expect(await stockage.lister()).toEqual([]);
  });

  it("une exception (fetch impossible) compte comme une absence de réseau", async () => {
    const stockage = await fileAvec(element("a", 1));
    expect(
      await envoyerFile(stockage, async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).toBe("reseau");
    expect(await stockage.lister()).toHaveLength(1);
  });

  it("session expirée : tout est conservé jusqu'à la reconnexion", async () => {
    const stockage = await fileAvec(element("a", 1), element("b", 2));
    expect(await envoyerFile(stockage, envoyeurSimule({ etat: "connexion" }).envoyer)).toBe("connexion");
    expect(await stockage.lister()).toHaveLength(2);
  });

  it("élément refusé : mis de côté avec le message, les suivants partent quand même", async () => {
    const stockage = await fileAvec(element("a", 1), element("b", 2));
    const { envoyer } = envoyeurSimule({ etat: "refuse", message: "Lieu inconnu." });
    expect(await envoyerFile(stockage, envoyer)).toBe("termine");
    const restants = await listerDansLOrdre(stockage);
    expect(restants.map((e) => [e.cle, e.erreur])).toEqual([["a", "Lieu inconnu."]]);
    // Un élément en erreur n'est plus renvoyé automatiquement.
    const ensuite = envoyeurSimule();
    await envoyerFile(stockage, ensuite.envoyer);
    expect(ensuite.envois).toEqual([]);
  });
});

describe("interpreterReponse", () => {
  const reponse = (statut: number, corps: unknown = {}) =>
    new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });

  it("succès, connexion, serveur indisponible, refus", async () => {
    expect(await interpreterReponse(reponse(201))).toEqual({ etat: "envoye" });
    expect(await interpreterReponse(reponse(401))).toEqual({ etat: "connexion" });
    expect(await interpreterReponse(reponse(502))).toEqual({ etat: "reseau" });
    expect(await interpreterReponse(reponse(400, { erreur: "Prix : obligatoire." }))).toEqual({
      etat: "refuse",
      message: "Prix : obligatoire.",
    });
  });
});

describe("elementsDeLaSortie", () => {
  it("retient la sortie, son essence, ses achats et leurs photos, et rien d'autre", () => {
    const image = new Blob();
    const achat = (sortieId: string | null, photoId: string | null): Operation => ({
      type: "achat",
      corps: { id: `a-${photoId}`, articleIds: ["x"], sortieId, prixTotal: 100, photoId, date: "2026-10-06" },
    });
    const elements = [
      element("1", 1, { type: "sortie", corps: { id: "S", date: "2026-10-06", lieuNom: "Braderie", notes: null } }),
      element("2", 2, { type: "photo", photoId: "p1", typePhoto: "terrain", image }),
      element("3", 3, achat("S", "p1")),
      element("4", 4, essence("S")),
      element("5", 5, { type: "photo", photoId: "p2", typePhoto: "terrain", image }),
      element("6", 6, achat(null, "p2")),
      element("7", 7, essence("autre")),
    ];
    expect(elementsDeLaSortie(elements, "S").map((e) => e.cle)).toEqual(["1", "2", "3", "4"]);
  });
});
