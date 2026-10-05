---
name: verifier
description: Vérifie le projet (types, lint, tests, build Docker) et résume en français ce qui passe ou échoue.
disable-model-invocation: true
---

# Vérifier le projet

Lance les vérifications **dans cet ordre**, même si l'une échoue (pour avoir une vue complète) :

1. `npm run typecheck` — vérification des types TypeScript
2. `npm run lint` — qualité du code
3. `npm test` — tous les tests, dont les cas chiffrés de l'annexe §11
4. `docker compose build` — l'image Docker se construit

Ne corrige **rien** pendant cette commande.

## Résumé attendu (en français)

Un tableau :

| Vérification | Résultat | Détail |
|---|---|---|
| Types | ✅ / ❌ | nombre d'erreurs, premier fichier concerné |
| Lint | ✅ / ❌ | … |
| Tests | ✅ / ❌ | X réussis / Y échoués ; liste des cas §11 en échec |
| Build Docker | ✅ / ❌ | … |

Puis :
- si tout est vert : « Tout est vert, le lot peut passer à la relecture. » ;
- sinon : pour chaque échec, la cause probable en une phrase et la correction proposée.
  **Demande** avant d'appliquer une correction.
