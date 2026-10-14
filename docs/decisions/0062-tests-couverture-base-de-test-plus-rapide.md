# ADR-0062 — Tests : couverture, base de test plus rapide

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : #130
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : nouvelle dépendance de développement **`@vitest/coverage-v8`** seulement (pas de
Testing Library) ; tests d'écrans, si besoin plus tard, avec Playwright (déjà présent pour l'extension).
- `npm run test:couverture` : rapport par paquet ; seuils du serveur un peu sous le niveau atteint (88 % des lignes
  au 14/10/2026), à relever au fil des tests. La CI garde `npm test` (pas de changement de `.github/`).
- Base de test : migrée une fois par fichier puis copiée pour chaque test (`server/src/test/outils.ts`) : suite
  serveur de ~128 s à ~61 s.
- Tests ajoutés pour les listes de référence (renommage, fusion, lieu « Maison »).
Points tranchés par Claude (*à relire*) : pas de test de bout en bout de Terrain et de la vente pour l'instant
(serveur + navigateur dans la CI, coût élevé) ; les tests de l'extension utilisent déjà des délais courts.
