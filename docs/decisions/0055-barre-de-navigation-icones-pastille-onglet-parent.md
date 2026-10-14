# ADR-0055 — Barre de navigation : icônes, pastille, onglet parent

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #103
- **Thème** : Interface
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : l'onglet « Réglages » garde son nom (pas de « Plus ») ; icônes **SVG du projet**
(`client/src/composants/Icones.tsx`, aucune dépendance) au-dessus de chaque libellé. La pastille d'alertes est
accrochée à l'icône d'Articles. L'onglet parent reste actif sur les écrans secondaires (`client/src/navigation.ts`,
choix de Claude, *à relire*) : fiche article et vente → Articles ; sorties → Terrain ; frais divers → Tableau ;
listes, corbeille, publication Vinted → Réglages.
