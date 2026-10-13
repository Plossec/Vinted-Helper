---
name: version
description: Donne sa version à la PR en cours (règle 1.x) — numéro, CHANGELOG daté, package.json, architecture. Le tag est créé par GitHub après la mise en production.
argument-hint: "[numéro de version, facultatif]"
disable-model-invocation: true
---

# Version de la PR en cours

Numéro demandé : `$ARGUMENTS` (vide = à choisir selon la règle ci-dessous).

**Chaque PR qui part en production porte sa version** (décision du 13/10/2026, issue #114). `/lot` et
`/calibrer-vinted` appliquent cette procédure à la fin de leur travail, dans la branche de la PR. Plusieurs issues
dans une même PR → une seule version.

## 1. Vérifications préalables
- Branche de la PR (jamais `main`), `git status` propre.
- La section `[Non publié]` du `CHANGELOG.md` décrit ce que la PR change (sinon, complète-la d'abord à partir de
  `git log origin/main..HEAD`, en langage compréhensible par l'utilisateur, avec les numéros d'issue).

## 2. Choisir le numéro (SemVer)
Version actuelle : `version` du `package.json` racine (source unique). Dernier tag : `git tag --sort=-v:refname`.

| Contenu de `[Non publié]` | Version |
|---|---|
| Au moins un « Ajouté » (fonctionnalité visible) | chiffre du milieu : 1.6.1 → **1.7.0** |
| Seulement « Corrigé » et/ou « Modifié » | dernier chiffre : 1.7.0 → **1.7.1** |
| Rupture (données ou usage incompatibles) | premier chiffre : **2.0.0**, uniquement avec l'accord de l'utilisateur |

Annonce le numéro choisi en une phrase (pas besoin d'attendre, sauf rupture).

## 3. Mettre à jour
1. `npm version X.Y.Z --no-git-tag-version --workspaces --include-workspace-root` : `package.json` racine, `client/`,
   `server/` et `package-lock.json`, tous identiques.
2. `CHANGELOG.md` : `## [Non publié]` devient `## [X.Y.Z] — JJ/MM/AAAA` (date du jour, Europe/Paris), rubriques
   Ajouté / Modifié / Corrigé (vides omises) ; recrée au-dessus une section `## [Non publié]` vide.
3. `docs/architecture.md` : compare-le à `git diff <dernier tag>..HEAD --stat`. Mets les schémas à jour si la
   version ajoute, retire ou renomme une table ou une migration (`server/drizzle/`), un module de `server/src/` ou
   de `client/src/`, un service de `docker-compose*.yml`, un service externe ou un composant de l'extension.
   Dans tous les cas, mets à jour la ligne « À jour pour la version X.Y.Z » en tête du fichier.
4. Extension modifiée : sa propre version (`outils/extension-vinted/manifest.json` **et** `package.json`) suit
   `/calibrer-vinted`, étape 6 ; elle est indépendante de celle de l'application.

## 4. Commit (pas de tag)
- `git commit -m "Version X.Y.Z"` dans la branche de la PR (avec les autres commits de la PR).
- **Ne crée pas de tag** : après la fusion, GitHub Actions met en production puis crée `vX.Y.Z` (job « Créer le tag
  de version » de `.github/workflows/deploiement.yml`). Pas de tag si la mise en production échoue.
- Dans le message final à l'utilisateur : « Version X.Y.Z ; le tag est créé automatiquement après la mise en
  production. »
