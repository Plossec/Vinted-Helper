// Écran d'ouverture de l'application installée (#191) : Terrain (par défaut, pour le vide-grenier) ou À faire.
// Choix mémorisé sur l'appareil (localStorage), comme le thème : le manifeste ouvre « /demarrage », qui redirige.

export type EcranDemarrage = "terrain" | "a-faire";

export const CHOIX_DEMARRAGE: readonly { valeur: EcranDemarrage; libelle: string }[] = [
  { valeur: "terrain", libelle: "Terrain" },
  { valeur: "a-faire", libelle: "À faire" },
];

const CLE = "vh-demarrage";

/** Valeur inconnue ou absente : « terrain » (comportement d'avant #191). */
export function normaliserDemarrage(valeur: unknown): EcranDemarrage {
  return valeur === "a-faire" ? "a-faire" : "terrain";
}

export function lireDemarrage(): EcranDemarrage {
  try {
    return normaliserDemarrage(localStorage.getItem(CLE));
  } catch {
    return "terrain";
  }
}

export function enregistrerDemarrage(ecran: EcranDemarrage): void {
  try {
    localStorage.setItem(CLE, ecran);
  } catch {
    // Préférence facultative.
  }
}

export const cheminDemarrage = (ecran: EcranDemarrage) => (ecran === "a-faire" ? "/" : "/terrain");
