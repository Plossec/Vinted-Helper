---
name: lot
description: Réalise une issue GitHub de bout en bout (mode issues / PR) — lit l'issue, lève les ambiguïtés, planifie, code avec tests, vérifie, documente, ouvre la PR « #N — … » et la fusionne quand la CI est verte. Avec une demande en texte libre, crée d'abord l'issue.
argument-hint: "<numéro d'issue | demande en texte libre>"
disable-model-invocation: true
---

# Réaliser une issue

Entrée : `$ARGUMENTS`.

Les lots du cahier des charges (§9) sont terminés : le travail se fait par **issue → branche → PR → fusion**. Une
fusion dans `main` **part en production** (déploiement continu) : ne fusionne que du code prêt.

## 0. Pas encore d'issue ?
Si l'entrée n'est pas un numéro d'issue, c'est une nouvelle demande : crée l'issue (titre `[Évolution] …` ou
`[Correctif] …` ; contexte, demande de l'utilisateur citée, points à préciser), donne son lien et **demande s'il faut
la réaliser maintenant**. Arrête-toi là tant que l'utilisateur n'a pas répondu oui.

## 1. Point de départ
- `git status` propre ; sinon, arrête-toi et explique ce qui reste.
- Branche de travail repartie de `main` à jour (`git fetch origin main`, puis la branche indiquée par la session,
  sinon une branche nommée d'après le sujet). Jamais de travail direct sur `main`.
- L'issue est ouverte et n'est pas déjà réalisée par une PR en cours.

## 2. Comprendre
- L'issue **et ses commentaires** (les précisions de l'utilisateur y sont souvent).
- Selon le sujet : `docs/cahier-des-charges.md` (statuts §4, fonctionnalités §5, calculs §6, critères §8, cas §11,
  hors périmètre §10), les décisions concernées (`docs/decisions/README.md`), le guide utilisateur concerné,
  `docs/architecture.md`.
- Le code existant du même genre (une évolution déjà faite sur le même modèle sert de patron : `git log --grep`).

## 3. Lever les ambiguïtés
Point flou, contradiction avec le cahier des charges, choix qui change le comportement : pose la question, **une à la
fois**. Note les réponses en commentaire sur l'issue. Si l'utilisateur a dit de trancher, tranche et note le choix
« *à relire* » dans la décision.

## 4. Plan
Plan court : fichiers touchés, migration éventuelle, tests prévus, documentation.
**Attends la validation** si l'issue touche : une migration, le module de calcul ou un cas §11, le cahier des
charges, une règle de `CLAUDE.md`, une nouvelle dépendance, ou plusieurs écrans. Sinon (correctif ou évolution
locale déjà précisée dans l'issue), annonce le plan en une ligne et enchaîne.

## 5. Réaliser
- **Tests d'abord** pour le calcul et les règles métier ; jamais modifier un test de l'annexe §11 pour le faire
  passer.
- Migration : `server/drizzle/` uniquement par `npx drizzle-kit generate --name <nom>` (`.claude/rules/migrations.md`).
- Interface : `.claude/rules/interface.md` (français, mobile d'abord, montants et dates).
- Commits petits, en français, à l'impératif, avec le numéro de l'issue.

## 6. Vérifier et documenter
- `/verifier` : les étapes de la CI doivent être vertes (et l'extension si elle a changé).
- Documentation, selon le cas :
  - guide utilisateur concerné (`docs/guides/`) ;
  - `CHANGELOG.md`, section `[Non publié]`, en langage simple, avec le numéro de l'issue ;
  - décision datée dans le fichier du sujet (`docs/decisions/`) ou `00-outillage-et-methode.md` pour la méthode ;
  - cahier des charges, **avec l'accord de l'utilisateur** ;
  - `docs/architecture.md` si une table, un module, un service ou un outil externe change.
- Relis ton diff : périmètre de l'issue seulement, aucun secret, aucune donnée personnelle (dépôt public).

## 7. Livrer
- Push, puis PR **`#N — <Verbe> …`** avec `Closes #N` (une PR pour plusieurs issues : `#A, #B — …`, un `Closes`
  par issue).
- Surveille la PR ; CI rouge → corrige et repousse. **Fusionne** quand la CI est verte.
- Message court à l'utilisateur : ce qui change, ce qu'il doit faire (mettre à jour l'application, `git pull`,
  recharger l'extension…), étapes pas à pas.
- Une version (`/version`) n'est faite que sur demande.
