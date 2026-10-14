---
name: verifier
description: Vérifie le projet avec exactement les étapes de la CI GitHub (npm run verifier : types, lint, format, tests, construction), plus les tests de l'extension et l'image Docker quand c'est possible, et résume en français ce qui passe ou échoue.
disable-model-invocation: true
---

# Vérifier le projet

1. Si `node_modules` manque : `npm ci` (comme la CI).
2. **`npm run verifier`** (`scripts/verifier.mjs`) : types, lint (dont `.skip` / `.only` interdits), format, tests,
   construction. C'est **la même commande que la CI** (job « Vérifier ») : si elle passe ici, la PR passera. Le script
   lance toutes les étapes, même après un échec, et termine par un résumé.
3. **Hors CI** :
   - **Extension** — seulement si `outils/extension-vinted/` a changé (`git diff --name-only main...HEAD` et
     modifications non commitées) : `npm test` dans `outils/extension-vinted` (dépendances : `npm ci` dans ce dossier ;
     Chromium : chemin des sessions cloud ou variable `VH_CHROME_TEST`). S'ils manquent : « non lancé » et pourquoi.
   - **Image Docker** — `docker compose build` si Docker est disponible (`docker compose version`) ; sinon « non
     lancé (pas de Docker) ».

Ne corrige **rien** pendant cette commande.

## Résumé attendu (en français)

| Vérification | Résultat | Détail |
|---|---|---|
| Types, Lint, Format, Tests, Construction | ✅ / ❌ (une ligne chacune, d'après le résumé du script) | premier fichier ou test en échec ; cas §11 en échec |
| Extension | ✅ / ❌ / non lancé | X réussis / Y échoués, ou raison |
| Image Docker | ✅ / ❌ / non lancé | … |

Puis : si `npm run verifier` est vert, « Tout est vert : la CI passera. » (et ce qui n'a pas été lancé) ; sinon,
pour chaque échec, la cause probable en une phrase et la correction proposée. **Demande** avant de corriger.
