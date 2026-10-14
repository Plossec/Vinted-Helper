# ADR-0063 — Outillage Claude allégé et vérification unique

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #113, #115, #116
- **Thème** : Méthode
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décisions (utilisateur)** :
- **#113** `CLAUDE.md` réécrit (133 → 90 lignes), « Conventions » et « Profil » raccourcis aussi : restes du mode
  « lots » retirés, doublons supprimés (versions → `/version`, calcul → `rules/calculs.md`), exception écrite
  (invoquer `/lot` ou `/calibrer-vinted` vaut demande de push et de fusion), règle des fichiers sensibles reprise.
  Nouvelles règles ciblées : `.claude/rules/extension-vinted.md` (règle n° 4, version `manifest.json` +
  `package.json`, tests) et `.claude/rules/gemini.md` ; `calibrer-vinted` et `interface.md` allégés en conséquence.
- **#115** une seule liste d'étapes : `npm run verifier` (`scripts/verifier.mjs`), appelé par la CI et par
  `/verifier`. Nouvelle dépendance de développement **`@vitest/eslint-plugin`** (choix de l'utilisateur) :
  `.skip` / `.only` refusés par le lint ; `@ts-expect-error` aussi refusé (`ban-ts-comment`). Agent `relecteur`
  centré sur issue / PR et sur ce qu'un outil ne voit pas (toujours à la demande) ; `analyste-releve` passe sur un
  modèle plus léger, et le format du relevé va dans `publication-vinted.md` (depuis #197 : `docs/guides/publication-vinted.md`).
- **#116** réglages du compte (hors dépôt) : à faire par l'utilisateur — désactiver le plugin `design` et les skills
  inutiles, déconnecter pour ce projet Era_Context, Gmail, Slack, Notion, Linear, Asana, Atlassian, Figma ; garder
  GitHub.
Point tranché par Claude (*à relire*) : pas de table des matières du cahier des charges (numéros de ligne vite
périmés) ; lecture ciblée par recherche du titre de §.
