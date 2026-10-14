// Onglets de la barre de navigation (issue #103) : l'onglet parent reste actif sur ses écrans secondaires.
// Écran « À faire » en premier onglet, à l'adresse « / » (#191) ; la liste des articles est en « /articles ».

export type Onglet = "a-faire" | "articles" | "terrain" | "tableau" | "reglages";

/** Premier segment de l'adresse → onglet parent (fiche article et vente sous Articles, sorties sous Terrain…). */
const PARENTS: Record<string, Onglet> = {
  "": "a-faire",
  articles: "articles",
  ventes: "articles",
  terrain: "terrain",
  sorties: "terrain",
  tableau: "tableau",
  frais: "tableau",
  reglages: "reglages",
  listes: "reglages",
  corbeille: "reglages",
  publication: "reglages",
};

export function ongletActif(chemin: string): Onglet | null {
  const premier = chemin.split("/").filter(Boolean)[0] ?? "";
  return PARENTS[premier] ?? null;
}
