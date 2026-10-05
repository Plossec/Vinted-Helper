# Décisions prises en cours de développement

Complète `docs/cahier-des-charges.md`. En cas de contradiction, la décision la plus récente fait foi.
Format : date, sujet, décision, raison.

---

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

## 05/10/2026 — Lot 0 : choix techniques de mise en place

**Dépendances** (validées par l'utilisateur avant installation)
| Paquet | Où | Raison |
|---|---|---|
| `fastify` 5, `@fastify/static` | serveur | Serveur web léger et bien typé ; sert aussi l'interface compilée |
| `drizzle-orm`, `pg` | serveur | Accès à PostgreSQL (choix validé) |
| `drizzle-kit` (dév.) | serveur | Génération des migrations (jamais `push`) |
| `tsx` (dév.) | serveur | Exécuter le TypeScript en développement et pour `db:migrate` |
| `vitest` (dév.) | serveur | Tests, dont ceux de l'annexe §11 |
| `@types/pg` (dév.) | serveur | Types de `pg` |
| `react`, `react-dom` 19 | client | Interface (choix validé) |
| `vite` 8, `@vitejs/plugin-react` (dév.) | client | Construction de l'interface |
| `@types/react`, `@types/react-dom` (dév.) | client | Types React |
| `typescript`, `@types/node` 22 (dév.) | racine | Vérification des types ; `@types/node` aligné sur Node 22 (version réellement utilisée) |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` (dév.) | racine | Lint |
| `prettier` (dév.) | racine | Formatage (utilisé par le hook) |

Écart mineur au plan : les définitions de types `@types/pg` et `@types/react*` sont rangées dans le sous-projet qui les
utilise (serveur / client) plutôt qu'à la racine. Aucun effet pour l'utilisateur.

**Organisation**
- Un `package.json` racine (version de référence) avec deux sous-projets npm : `server` et `client`.
- Le serveur sert l'API (`/api/…`) et l'interface compilée ; toute autre adresse renvoie l'interface (application d'une page).
- Configuration par variables d'environnement : `.env` à la racine (lu par Docker Compose, et par Node avec
  `--env-file-if-exists` pour les scripts locaux). Pas de `dotenv`.
- L'adresse de la base est construite à partir de `POSTGRES_*` : hôte `db` dans Docker, `localhost` sur le PC.

**Docker**
- Deux services : `app` (Node 22 alpine, image en deux étapes, utilisateur non-root) et `db` (PostgreSQL 17 alpine).
- Base dans un **volume Docker nommé** (`base-donnees`) : plus fiable et plus rapide sous Windows qu'un dossier partagé.
- Photos dans `./data/photos` (dossier visible sous Windows, ignoré par Git, protégé contre Claude).
- Ports ouverts **uniquement sur 127.0.0.1** (PC local). L'accès téléphone sera ouvert avec le HTTPS (issue #3).
- Migrations appliquées automatiquement au démarrage du serveur.

**Fins de ligne** : `.gitattributes` impose LF, pour que les scripts fonctionnent dans les conteneurs même depuis Windows.

**Formatage** : Prettier ignore les fichiers `.md` (documents rédigés à la main, dont le cahier des charges).

**Vérifications faites dans l'environnement cloud** : `npm test` (27 tests), `typecheck`, `lint`, `build`, construction
de l'image et démarrage des deux conteneurs, `/api/sante` → `{"version":"0.0.1","base":"connectée"}`, page affichée en
clair et sombre (360 px), `db:sauvegarde`, `db:migrate`, `db:generate`.
Particularité de l'environnement cloud uniquement : les conteneurs n'y ont pas accès à internet sans proxy ; le test de
construction a utilisé une copie temporaire du Dockerfile avec le proxy et son certificat. Le `Dockerfile` du projet,
lui, n'en dépend pas (pas de proxy sur le PC).

**Question — règle d'arrondi (§6)** *(tranchée, voir décision suivante)* : appliquée à la lettre, la règle peut donner une part **négative** au
dernier élément quand le montant est très petit par rapport au nombre d'éléments (ex. 5 centimes sur 8 articles →
1, 1, 1, 1, 1, 1, 1, −2) ou une part très déséquilibrée (65 centimes sur 10 → 7 × 9 puis 2). Le code applique la règle
telle qu'écrite ; décision à prendre par l'utilisateur.

---

## 05/10/2026 — Règle d'arrondi : arrondi vers le bas, le reste sur le dernier

**Décision (utilisateur)** : dans toute répartition (lot, essence, emballage, vente groupée), chaque part est
**arrondie au centime inférieur** et le **dernier élément reçoit tout le reste**.

**Raison** : l'arrondi au plus proche pouvait donner une part négative au dernier élément (5 centimes sur 8 articles →
1 × 7 puis −2). Avec l'arrondi vers le bas, aucune part n'est jamais négative (5 centimes sur 8 → 0 × 7 puis 5).

**Conséquences**
- Cahier des charges §6 et annexe §11 mis à jour. Trois cas changent :

| Cas | Avant | Après |
|---|---|---|
| 2 — lot de 3 articles pour 5 € | 1,67 / 1,67 / 1,66 | 1,66 / 1,66 / 1,68 |
| 5 — essence 2 € sur 3 articles | 0,67 / 0,67 / 0,66 | 0,66 / 0,66 / 0,68 |
| 12 — emballage 0,08 € sur 3 articles | 0,03 / 0,03 / 0,02 | 0,02 / 0,02 / 0,04 |

- Les cas 1, 3, 4, 6, 8, 9, 10, 11, 23 et 31 sont inchangés (vérifié).
- Tests de l'annexe modifiés **sur décision explicite de l'utilisateur** (seule raison admise de modifier un résultat
  attendu). Ajout de tests garantissant qu'aucune part n'est négative.

---

## 05/10/2026 — Git : manipulations faites par Claude

**Décision (utilisateur)** : Claude effectue lui-même les manipulations Git (branches, commits, push, fusions, pull
requests) sans demander à l'utilisateur de lancer les commandes. Restent soumises aux interdictions de
`.claude/settings.json` (pas de réécriture d'historique, pas de `--force`, etc.). Limite technique : la session cloud ne
peut pas pousser de tags (refus réseau 403) ; les tags de version sont alors poussés depuis le PC.

---

## 05/10/2026 — Lot 1 : décisions de cadrage

| Sujet | Décision |
|---|---|
| Statuts | Le tableau complet des transitions (§4.2) est codé et testé côté serveur dès le lot 1 ; l'interface et l'API ne proposent que Brouillon ↔ À publier ↔ En ligne. Les autres passages (vente, colis, sortie du stock) arrivent au lot 3. |
| Photos d'annonce | Au lot 2, avec les photos terrain. La fiche du lot 1 est sans photo. |
| Listes de référence | Pré-remplies au premier démarrage avec les valeurs du tableur de l'utilisateur ; modifiables ; nouvelles valeurs créées à la volée. Unicité sans tenir compte des majuscules. |
| Session | 30 jours sans utilisation, prolongée à chaque usage ; déconnexion dans les Réglages. |
| Prix affiché | Historique enregistré dès le lot 1 (chaque saisie ou modification datée) ; affichage de l'historique sur la fiche au lot 3. |
| Champs obligatoires (création manuelle) | Nom, lieu, prix d'achat, date d'achat (aujourd'hui par défaut). Lieu « Maison » : prix d'achat proposé à 0 €. |
| À publier | Aucun contrôle de complétude (non défini au cahier des charges). Seul « En ligne » exige un prix affiché. |
| Dépendances ajoutées | `@fastify/cookie` (cookie de session), `react-router` (navigation), `@electric-sql/pglite` en dév. (PostgreSQL en mémoire pour les tests, sans Docker). |

---

## 05/10/2026 — Lot 1 : choix pendant le développement

- **Tests sans Docker** : les tests de l'API tournent sur une vraie base PostgreSQL en mémoire (PGlite) avec les
  migrations du projet ; `npm test` ne touche jamais la base de l'utilisateur.
- **`vitest` déclaré aussi dans le client** (même outil que le serveur, pas de nouvelle bibliothèque) pour tester la
  lecture des montants saisis (virgule ou point → centimes entiers, sans calcul à virgule).
- **Mot de passe** : haché avec scrypt (intégré à Node). Jeton de session aléatoire dans un cookie inaccessible au
  JavaScript ; seule son empreinte est stockée. Changer le mot de passe déconnecte les autres appareils.
- **Dates de statut** : une date dans le futur est refusée (tolérance 5 minutes pour l'écart d'horloge). Aucune autre
  contrainte (une date antérieure à la création est acceptée ; l'historique est trié par date).
- **API** : les transitions proposées sont calculées par le serveur (source unique) ; l'interface ne les recopie pas.
- **Audit npm** : 4 alertes « modérées » sur une ancienne version d'`esbuild` utilisée en interne par `drizzle-kit`
  (outil de développement, absent de l'application livrée). La « correction » proposée (`npm audit fix --force`)
  rétrograderait `drizzle-kit` : non appliquée. À revoir quand `drizzle-kit` publiera une mise à jour.
- **Génération de migration** : lancer `npx drizzle-kit generate --name <nom>` dans `server/`
  (`npm run db:generate -- --name …` perd l'option à travers les sous-projets).
- **Correction** : la commande `reset-password` lisait mal deux réponses envoyées d'un coup sans terminal interactif ;
  corrigé et testé (mode interactif avec saisie masquée, et mode non interactif).
