# ADR-0044 — Dependabot : TypeScript 7 ignoré pour l'instant

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #169
- **Thème** : Serveur

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : la PR Dependabot #162 (TypeScript 7) est fermée, `typescript-eslint` 8.x n'acceptant
que `typescript < 6.1`. Dependabot ignore les versions majeures de TypeScript jusqu'à ce que typescript-eslint suive
(règle à retirer alors). Mises à jour Dependabot : les **mineures** sont fusionnées quand la CI est verte ; les
**majeures** (Node 26 dans l'image Docker, `@types/node` 26) attendent d'être faites ensemble, avec un essai sur le
serveur. Une PR qui touche `.github/` ou le `Dockerfile` reste soumise à l'accord de l'utilisateur.
