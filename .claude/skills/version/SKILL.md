---
name: version
description: Propose le numéro de version, met à jour le CHANGELOG et le package.json racine, puis crée le tag Git.
argument-hint: "[numéro de version, facultatif]"
disable-model-invocation: true
---

# Nouvelle version

Numéro demandé : `$ARGUMENTS` (vide = à proposer).

## 1. Vérifications préalables
- `git status` doit être propre (tout est commité). Sinon, arrête-toi.
- `/verifier` doit avoir été lancé et être entièrement vert sur ce commit. En cas de doute, demande à l'utilisateur.

## 2. Proposer le numéro (SemVer)
Lis la version actuelle dans le `package.json` racine (source unique) et le dernier tag (`git tag --sort=-v:refname`).

| Situation | Version |
|---|---|
| Lot 0 terminé | `0.0.1` |
| Lot N validé | `0.N.0` |
| Correctif après un lot | incrément du dernier chiffre (`0.N.1`, `0.N.2`…) |
| Mise en ligne OVH validée | `1.0.0` |

Explique ton choix en une phrase et **attends la confirmation** de l'utilisateur.

## 3. Mettre à jour
1. `version` du `package.json` racine (et des `package.json` de `client/` et `server/` s'ils en ont une,
   pour qu'ils restent identiques).
2. `CHANGELOG.md` : nouvelle section en haut, en français :
   ```
   ## [X.Y.Z] — JJ/MM/AAAA
   ### Ajouté
   - …
   ### Modifié
   - …
   ### Corrigé
   - …
   ```
   Rédige les entrées à partir de `git log <dernier tag>..HEAD`, en langage compréhensible par l'utilisateur
   (pas de jargon technique). Omets les rubriques vides.

## 4. Commit et tag
- `git add package.json client/package.json server/package.json CHANGELOG.md` (ceux qui existent)
- `git commit -m "Version X.Y.Z"`
- `git tag -a vX.Y.Z -m "Version X.Y.Z"`

**Ne pousse pas** : indique à l'utilisateur la commande à lancer (`git push --follow-tags`)
et ce qu'elle fait.
