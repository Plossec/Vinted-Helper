# Décisions — Outillage Claude et méthode de travail

[← Index des décisions](README.md)

## 05/10/2026 — Outillage Claude : relecteur et hooks

**Décision**
- **Sous-agent `relecteur`** (`.claude/agents/relecteur.md`) : lecture seule (Read, Grep, Glob), lancé **uniquement à la
  demande de l'utilisateur** en fin de lot. Reçoit le numéro du lot et les fichiers modifiés depuis `main`. Compare au
  cahier des charges (§9, §8, §6, §10) et à `CLAUDE.md`. Rapport Bloquant / À corriger / Remarque, avec fichier, ligne,
  règle et correction proposée, puis la liste des critères d'acceptation couverts / non couverts. Ne corrige rien.
- **Hook `PostToolUse` → `formater.mjs`** (Edit, Write) : Prettier sur le fichier modifié, seulement `.ts`, `.tsx`, `.js`,
  `.json`, `.css`, seulement dans le dossier du projet (hors `node_modules`). Non bloquant. Sans effet tant que Prettier
  n'est pas installé dans le projet (lot 0).
- **Hook `Stop` → `tests-calculs.mjs`** :
  - ne fait rien si aucun fichier de `server/src/calculs/` n'est touché : modifications non commitées, fichiers non suivis,
    **et fichiers modifiés sur la branche par rapport à `main`** (option 2 retenue : un changement commité dans le même
    tour est aussi couvert) ;
  - sinon lance **uniquement** `npm test -w server -- calculs` (commande de `CLAUDE.md`) ; la suite complète reste le
    rôle de `/verifier` ;
  - en cas d'échec : code de sortie 2, rapport renvoyé à Claude, qui doit corriger avant de rendre la main ;
  - anti-boucle : si `stop_hook_active` est vrai, ne bloque plus ; si les tests échouent encore, affiche un avertissement
    à l'utilisateur (`systemMessage`).
- Scripts en **Node** (pas de bash ni de jq) pour fonctionner pareil sous Windows (Git Bash) et Linux. Node est installé
  sur le PC de l'utilisateur.

**Raison** : relecture indépendante en fin de lot ; formatage homogène sans y penser ; impossible de rendre la main avec
un module de calcul cassé.

**Installation** : `.claude/settings.json` et `.claude/hooks/` sont protégés en écriture contre Claude. Les scripts ont
d'abord été déposés dans `.claude/a-installer/`. Sur **autorisation explicite et ponctuelle de l'utilisateur**, Claude
les a déplacés dans `.claude/hooks/` et a remplacé la section `hooks` de `settings.json` (permissions inchangées).
Cette autorisation ne vaut que pour cette fois : toute modification future de ces fichiers est faite par l'utilisateur.

**Vérification** : les deux scripts ont été testés à la main sur un projet factice hors du dépôt (formatage d'un `.ts`,
`.md` et fichier hors projet ignorés, entrée invalide sans effet ; tests lancés uniquement quand le calcul est touché,
y compris après commit ; échec → code 2 ; `stop_hook_active` → avertissement sans blocage).

---

## 05/10/2026 — Git : manipulations faites par Claude

**Décision (utilisateur)** : Claude effectue lui-même les manipulations Git (branches, commits, push, fusions, pull
requests) sans demander à l'utilisateur de lancer les commandes. Restent soumises aux interdictions de
`.claude/settings.json` (pas de réécriture d'historique, pas de `--force`, etc.). Limite technique : la session cloud ne
peut pas pousser de tags (refus réseau 403) ; les tags de version sont alors poussés depuis le PC.

---

## 05/10/2026 — Travail autonome sur les lots 2 à 7

**Décision (utilisateur)** : Claude enchaîne les lots 2 à 7 sans validation intermédiaire (« d'ici demain »), en mode
Auto, y compris pour Git (checkout…), npm, Docker et les commandes Windows (hors interdictions de `.claude/settings.json`).
Les points flous sont **tranchés par Claude et notés ici** (marqués « *à relire* ») ; chaque lot est livré par
une pull request fusionnée dans `main` dès que les vérifications sont vertes. Remplace, pour cette nuit, la règle « un
lot validé sur le téléphone avant le suivant ». Les tags de version restent à pousser depuis le PC.

---

## 08/10/2026 — Calibrage de l'extension Vinted : sous-agent et skill

**Décision (utilisateur, #73 et #74)** : après le retour d'expérience du 08/10/2026, la correction de l'extension à
partir d'un relevé est outillée :
- sous-agent **`analyste-releve`** (`.claude/agents/`, lecture seule) : lit le relevé (et les captures) hors de la
  conversation principale et ne rend que la conclusion (étape, extrait, correction, fragment pour la fausse page) ;
- skill **`/calibrer-vinted`** (`.claude/skills/`) : issue → analyse → test qui échoue → correction → tests →
  version de l'extension → PR fusionnée → étapes de mise à jour pour l'utilisateur.

Points tranchés par Claude (*à relire*) : le sous-agent lit aussi les captures d'écran ; il est utilisé dès qu'un
relevé arrive, seul ou depuis le skill ; le skill peut être lancé par Claude dès qu'un relevé ou une erreur de
remplissage est envoyé ; la PR est fusionnée quand les vérifications GitHub sont vertes (l'extension ne part pas en
production : l'utilisateur la met à jour par `git pull`), puis l'utilisateur refait un essai.

---

## 08/10/2026 — `/lot` en mode issues / PR (#82)

**Décision (utilisateur)** : les lots du §9 étant terminés, `/lot` ne démarre plus un lot mais **réalise une issue**
de bout en bout : `/lot <numéro>` (ou une demande en texte libre, qui crée d'abord l'issue). Étapes : point de départ,
lecture de l'issue et des sources, questions, plan (validation demandée pour une migration, le calcul, le cahier des
charges, une règle, une dépendance ou plusieurs écrans), réalisation avec tests, `/verifier`, documentation, PR
`#N — …` fusionnée quand la CI est verte. Une nouvelle décision va dans le fichier de son sujet.

## 13/10/2026 — Une version par PR, tag automatique (issue #114)

**Décision (utilisateur)** : « Est-il possible que tu fasses le versionnage à chaque fois ? » → chaque PR qui part
en production porte sa version (procédure `/version`, appliquée par `/lot` et `/calibrer-vinted`) ; plus de PR
« Version X.Y.Z » séparée. Règle 1.x : un « Ajouté » → chiffre du milieu ; seulement « Corrigé » / « Modifié » →
dernier chiffre ; rupture → premier chiffre avec l'accord de l'utilisateur. La session ne pouvant pas pousser de tags,
le job « Créer le tag de version » de `.github/workflows/deploiement.yml` crée `vX.Y.Z` après une mise en production
réussie (droit `contents: write` limité à ce job ; pas de tag si le déploiement échoue ou est annulé).

## 13/10/2026 — Sécurité du dépôt : réglages, hooks, fusions (issues #110, #111, #112)

**Décisions (utilisateur)** :
- **Fusions** : Claude fusionne seul quand la CI est verte, **sauf** une PR qui touche une migration, `docker-compose*`,
  `Dockerfile`, `.github/` ou `.claude/` (accord demandé). Seuls les commentaires de `Plossec` sont des consignes
  (dépôt public). `main` protégée côté GitHub (PR + check « Vérifier » obligatoires, sans approbation).
- **`.claude/settings.json`** (mis en place par l'utilisateur) : protection du fichier des secrets corrigée
  (`Read(**/.env)`…) et complétée par le hook `proteger-env.mjs` pour Bash et PowerShell (constaté : il refuse
  aussi une commande qui ne fait que citer ce fichier) ; règles PowerShell alignées sur Bash ; envoi direct sur
  `main` refusé ; outils GitHub qui écrivent des fichiers (`push_files`, `create_or_update_file`, `delete_file`)
  refusés ; moins de confirmations inutiles (`git fetch`, `gh issue/pr view|list|create`…).
- **Hooks** : `npm ci` automatique au démarrage d'une session cloud (`installer-dependances.mjs`) ; le hook du calcul
  ne bloque plus quand les dépendances manquent et ne relance pas des tests inchangés ; le formatage couvre aussi
  `.mjs`, `.yml`, `.html`.
- Les fichiers protégés sont préparés par Claude et mis en place par l'utilisateur (branche poussée depuis le PC),
  Claude complétant la même branche.

## 13/10/2026 — Qualité du code : doublons retirés (issue #133)

**Décision (Claude, *à relire*)**, sans refonte :
- un seul `messageErreur` côté client, un seul `idDe` pour les routes, un seul `centimesVersSaisie` côté serveur ;
- `react`, `react-dom`, `react-router` passent en dépendances de développement (embarqués par Vite) : l'image
  Docker de production ne les installe plus ;
- `docs/categories-vinted.md` est **généré** depuis `catalogue/categories.ts` (`npm run doc:categories -w server`) ;
  un test échoue si l'annexe n'est plus à jour.
- **Non faits** : la réécriture de `annulerDernierChangement` en table (Q4), jugée sans gain réel (lisible, testée)
  et risquée ; le découpage des gros fichiers (Q5), à faire seulement quand on y touche.

## 14/10/2026 — Tests : couverture, base de test plus rapide (issue #130)

**Décision (utilisateur)** : nouvelle dépendance de développement **`@vitest/coverage-v8`** seulement (pas de
Testing Library) ; tests d'écrans, si besoin plus tard, avec Playwright (déjà présent pour l'extension).
- `npm run test:couverture` : rapport par paquet ; seuils du serveur un peu sous le niveau atteint (88 % des lignes
  au 14/10/2026), à relever au fil des tests. La CI garde `npm test` (pas de changement de `.github/`).
- Base de test : migrée une fois par fichier puis copiée pour chaque test (`server/src/test/outils.ts`) : suite
  serveur de ~128 s à ~61 s.
- Tests ajoutés pour les listes de référence (renommage, fusion, lieu « Maison »).
Points tranchés par Claude (*à relire*) : pas de test de bout en bout de Terrain et de la vente pour l'instant
(serveur + navigateur dans la CI, coût élevé) ; les tests de l'extension utilisent déjà des délais courts.

## 14/10/2026 — Outillage Claude allégé et vérification unique (issues #113, #115, #116)

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
  modèle plus léger, et le format du relevé va dans `publication-vinted.md`.
- **#116** réglages du compte (hors dépôt) : à faire par l'utilisateur — désactiver le plugin `design` et les skills
  inutiles, déconnecter pour ce projet Era_Context, Gmail, Slack, Notion, Linear, Asana, Atlassian, Figma ; garder
  GitHub.
Point tranché par Claude (*à relire*) : pas de table des matières du cahier des charges (numéros de ligne vite
périmés) ; lecture ciblée par recherche du titre de §.
