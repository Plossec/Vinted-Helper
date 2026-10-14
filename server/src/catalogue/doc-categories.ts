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
    "# Catégories (arbre recopié de Vinted)",
    "",
    "> Recopié de vinted.fr le 14/10/2026 (#177) pour les rayons Femmes, Hommes, Sport, Loisirs et collections ;",
    "> tout le reste va dans « Autre », à publier à la main sur Vinted. Seules les catégories du dernier niveau",
    "> (en **gras**) peuvent être choisies pour un article.",
    "",
    `**${CATEGORIES.length} catégories sélectionnables.**`,
  ];
  const sections = ARBRE_CATEGORIES.map((racine) =>
    [`## ${racine.nom}`, "", ...(racine.enfants ? lignes(racine.enfants, 0) : [`- **${racine.nom}**`])].join("\n"),
  );
  return [entete.join("\n"), ...sections].join("\n\n") + "\n";
}
