# ADR-0008 — Lot 1 : catégories, marques, états et listes déroulantes

- **Date** : 05/10/2026
- **Statut** : Accepté · catégories remplacées par [ADR-0065](0065-categories-recopiees-de-vinted.md)
- **Décideurs** : utilisateur
- **Issue** : #6, #7
- **Thème** : Socle

[← Index des décisions](README.md)

## Décision

| Sujet | Décision |
|---|---|
| Listes déroulantes | Composant maison avec recherche : aussi large que le champ, couleurs du site, clair / sombre, doigt et clavier (aucune option présélectionnée : la 1re flèche ↓ sélectionne la 1re). |
| Catégories | Arbre calqué sur Vinted, **rédigé de mémoire** (aucune requête vers Vinted), relu et validé par l'utilisateur : `docs/categories-vinted.md`, code `server/src/catalogue/categories.ts`. Fixe, seules les feuilles sont sélectionnables, stocké sur l'article sous forme de code (ex. `hommes/vetements/jeans/jeans-slim`). Obligatoire. |
| Marques | Liste de départ des marques courantes sur Vinted (358 dont « Sans marque ») + ajout à la volée. Obligatoire. Les comptes existants reçoivent les marques manquantes par la migration 0002 (sans doublon). |
| États | Liste fixe : Neuf avec étiquette, Neuf sans étiquette, Très bon état, Bon état, Satisfaisant, Abîmé. Obligatoire. |
| Obligatoire quand | À chaque enregistrement de la fiche ; seule la future saisie terrain (lot 2) pourra créer un brouillon sans. |
| Gamme | Texte libre facultatif ; sujet à approfondir : [issue #6](https://github.com/Plossec/Vinted-Helper/issues/6). |
| Lieu d'achat | Inchangé (liste + ajout) ; écran de gestion et création automatique : [issue #7](https://github.com/Plossec/Vinted-Helper/issues/7). |
| Migration 0001 | Écrite à la main dans un ordre sûr (copie des données avant suppression des anciennes tables) ; conversion testée. |
| Résultats de recherche | Les options qui commencent par le texte tapé s'affichent en premier. |
