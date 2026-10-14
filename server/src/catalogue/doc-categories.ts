// Annexe lisible de l'arbre des catégories (`docs/categories-vinted.md`), générée depuis `categories.ts` (#133) :
// une seule source ; un test vérifie que l'annexe est à jour (`npm run doc:categories -w server` pour la refaire).
import { ARBRE_CATEGORIES, CATEGORIES, type NoeudCategorie } from "./categories.js";

function lignes(noeuds: readonly NoeudCategorie[], niveau: number): string[] {
  return noeuds.flatMap((n) => {
    const retrait = "  ".repeat(niveau);
    return n.enfants ? [`${retrait}- ${n.nom}`, ...lignes(n.enfants, niveau + 1)] : [`${retrait}- **${n.nom}**`];
  });
}

export function documentCategories(): string {
  const entete = [
    "# Catégories (arbre calqué sur Vinted) — à relire",
    "",
    "> Rédigé **de mémoire** le 05/10/2026 : des écarts avec le Vinted actuel sont possibles.",
    "> Indiquez ce qu'il faut ajouter, renommer, déplacer ou supprimer. Seules les catégories du dernier niveau",
    "> (en **gras**) peuvent être choisies pour un article.",
    "",
    `**${CATEGORIES.length} catégories sélectionnables.**`,
  ];
  const sections = ARBRE_CATEGORIES.map((racine) =>
    [`## ${racine.nom}`, "", ...lignes(racine.enfants ?? [], 0)].join("\n"),
  );
  return [entete.join("\n"), ...sections].join("\n\n") + "\n";
}
