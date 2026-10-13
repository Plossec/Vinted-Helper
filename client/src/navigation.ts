// Onglets de la barre de navigation (issue #103) : l'onglet parent reste actif sur ses écrans secondaires.

export type Onglet = "articles" | "terrain" | "tableau" | "reglages";

/** Premier segment de l'adresse → onglet parent (fiche article et vente sous Articles, sorties sous Terrain…). */
const PARENTS: Record<string, Onglet> = {
  "": "articles",
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
