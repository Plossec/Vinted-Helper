---
name: verifier
description: Vérifie le projet avec les mêmes étapes que la CI GitHub (types, lint, format, tests, construction), plus les tests de l'extension et l'image Docker quand c'est possible, et résume en français ce qui passe ou échoue.
disable-model-invocation: true
---

# Vérifier le projet

Les étapes 1 à 5 sont **exactement celles de la CI** (`.github/workflows/deploiement.yml`, job « Vérifier »), dans le
même ordre : si elles passent ici, la PR passera. Si le workflow change, mets cette liste à jour.

Lance-les **toutes**, même si l'une échoue (pour avoir une vue complète). Si `node_modules` manque, lance d'abord
`npm ci` (comme la CI).

1. `npm run typecheck` — types TypeScript (serveur et client)
2. `npm run lint` — qualité du code (ESLint, extension comprise)
3. `npm run format:check` — formatage Prettier
4. `npm test` — tous les tests (serveur et client), dont les cas chiffrés de l'annexe §11
5. `npm run build` — construction du client et du serveur

En plus, **hors CI** :

6. **Tests de l'extension** — seulement si `outils/extension-vinted/` a changé (`git diff --name-only main...HEAD`,
   et modifications non commitées) : `npm test` dans `outils/extension-vinted`. Il faut ses dépendances
   (`npm ci` dans ce dossier) et Chromium (chemin par défaut des sessions cloud, sinon variable `VH_CHROME_TEST`) ;
   s'ils manquent, note « non lancé » et pourquoi.
7. **Image Docker** — `docker compose build`, seulement si Docker est disponible (`docker compose version`), donc sur
   le PC ; dans une session cloud, note « non lancé (pas de Docker) ».

Ne corrige **rien** pendant cette commande.

## Résumé attendu (en français)

| Vérification | Résultat | Détail |
|---|---|---|
| Types | ✅ / ❌ | nombre d'erreurs, premier fichier concerné |
| Lint | ✅ / ❌ | … |
| Format | ✅ / ❌ | fichiers mal formatés (`npm run format` les corrige) |
| Tests | ✅ / ❌ | X réussis / Y échoués ; liste des cas §11 en échec |
| Construction | ✅ / ❌ | … |
| Extension | ✅ / ❌ / non lancé | X réussis / Y échoués, ou raison |
| Image Docker | ✅ / ❌ / non lancé | … |

Puis :
- si les étapes 1 à 5 sont vertes : « Tout est vert : la CI passera. » (et ce qui n'a pas été lancé, en une ligne) ;
- sinon : pour chaque échec, la cause probable en une phrase et la correction proposée.
  **Demande** avant d'appliquer une correction.
