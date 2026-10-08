# Vinted Helper — Instructions pour Claude

## Le projet

Application web installable (PWA) pour un revendeur amateur sur Vinted : saisie rapide des achats en vide-grenier,
gestion du stock et des statuts, ventes (simples, groupées, retours), calcul du bénéfice, tableau de bord, rédaction
d'annonces par IA (Gemini). Un seul utilisateur en V1, données préparées pour plusieurs utilisateurs.
Développement local (PC Windows + Docker Desktop), puis hébergement sur un VPS OVH.

## Documentation (à lire quand le sujet l'exige, pas en entier à chaque fois)

- **`docs/cahier-des-charges.md` fait foi.** En cas d'ambiguïté ou de contradiction, **pose la question à
  l'utilisateur plutôt que de supposer**.
- `docs/decisions/` : décisions prises depuis, **un fichier par lot** (`lot-N.md`) ; elles priment sur le cahier des
  charges quand elles le précisent. Toute nouvelle décision y est consignée, datée.
- `docs/guides/` : modes d'emploi de l'utilisateur ; `docs/README.md` : sommaire et « où écrire quoi ».
- Consignes ciblées, chargées automatiquement selon les fichiers touchés : `.claude/rules/` (calculs, interface,
  migrations, déploiement).

## Commandes

| Action | Commande |
|---|---|
| Démarrer / arrêter (sans effacer les données) | `docker compose up -d --build` / `docker compose stop` |
| Journaux | `docker compose logs -f app` |
| Installer les dépendances (lockfile) | `npm ci` |
| Développement (hors Docker, base Docker démarrée) | `npm run dev:server` + `npm run dev:client` (http://localhost:5173) |
| Construire client + serveur | `npm run build` |
| Tests / calculs seuls | `npm test` / `npm test -w server -- calculs` |
| Types / lint / formatage | `npm run typecheck` / `npm run lint` / `npm run format` (`format:check` pour vérifier) |
| Sauvegarder la base (pg_dump) | `npm run db:sauvegarde` (automatique chaque jour : service `sauvegarde`, `sauvegardes/auto/`) |
| Générer / appliquer une migration | `npx drizzle-kit generate --name <nom>` dans `server/` / `npm run db:migrate` (aussi au démarrage) |
| Réinitialiser le mot de passe | `docker compose exec -it app npm run reset-password -w server` |

Restauration, serveur OVH et rapatriement des sauvegardes : voir `docs/guides/`. Garde ce tableau à jour si les
commandes changent. Les tests n'utilisent jamais Docker ni la vraie base (PGlite en mémoire, `server/src/test/`).

## Conventions

- **TypeScript strict** partout.
- **Termes métier en français dans le code**, identiques au glossaire du cahier des charges (§3) :
  `sortie`, `lot`, `prix_achat`, `prix_affiche`, `prix_vendu`, `vente`, `colis`, `frais_general`…
  Le code technique (hooks, utilitaires) peut rester en anglais.
- **Montants en centimes (entiers)** : stockés, calculés et transmis en centimes ; convertis en euros
  **uniquement à l'affichage**.
- **Dates stockées en UTC**, affichées en **Europe/Paris** (`JJ/MM/AAAA`).
- **Interface 100 % en français**, format `3,33 €`, saisie acceptant la virgule ou le point.
- Chaque donnée (sauf l'utilisateur) porte un `utilisateur_id`.

## Règles métier non négociables

1. **Toute répartition** (lot, essence, emballage, prix vendu) passe par **une seule fonction** du module de calcul
   (`server/src/calculs/`). **Aucun calcul d'argent en dehors de ce module.**
2. **Les parts calculées ne sont jamais stockées** en base : elles sont recalculées à partir des données.
3. **La clé Gemini reste côté serveur.** Jamais dans `client/`.
4. **Vinted** : la seule automatisation autorisée est la **publication d'annonces** par l'extension Chrome
   (`outils/extension-vinted/`, décisions des 06 et 07/10/2026, `docs/decisions/publication-vinted.md`). Aucune autre
   requête vers Vinted (ni lecture des ventes, ni messages, ni prix), **aucun contournement de détection**
   (camouflage du navigateur, captcha) : en cas de vérification, l'extension se met en pause et attend l'utilisateur.
5. **Rien de ce qui figure au §10 (hors périmètre) n'est développé** sans demande explicite.

## Garde-fous

Les interdictions techniques sont dans `.claude/settings.json` (appliquées par Claude Code, quoi que tu décides).
Les consignes ci-dessous complètent ces interdictions : respecte-les même quand rien ne t'en empêche techniquement.

**Données** — Ne jamais supprimer les volumes Docker, le dossier des photos, les sauvegardes ou la base. Travailler
uniquement sur la base locale de développement ; **aucune commande vers le VPS** sans demande explicite. Règles des
migrations : `.claude/rules/migrations.md`.

**Secrets** — Ne jamais lire, afficher ni commiter `.env` (`.env.example` : valeurs fictives uniquement). Aucun
secret dans le code, les logs, les tests ou les messages de commit.

**Git** — Travailler sur une branche (`lot-N` ou nommée d'après le sujet), **jamais directement sur `main`**. Aucun
push sans demande. **Une fusion dans `main` part en production** (déploiement continu, si les vérifications
GitHub passent). Ne jamais réécrire l'historique ni contourner les vérifications (`--no-verify`). Commits **petits
et fréquents**.

**Code et tests**
- Ne jamais modifier un test de l'annexe §11 pour le faire passer : corriger le code, ou **signaler le désaccord**.
- Ne jamais désactiver ni sauter un test (`.skip`, `.only`, test commenté).
- Pas de `any`, `@ts-ignore`, `@ts-expect-error` ou `eslint-disable` pour contourner une erreur.
- Les tests **n'appellent jamais réellement Gemini** : réponse simulée, pour préserver le quota gratuit.

**Dépendances** — Toute nouvelle dépendance est **proposée avec sa justification** avant d'être installée. **npm
uniquement**, aucune installation globale, `package-lock.json` toujours commité. Aucun script destructeur (reset de
base, suppression de données) dans `package.json`.

**Périmètre et système** — Un lot à la fois, rien du §10, **aucune refonte non demandée**. Ne rien modifier en dehors
du dossier du projet (ni Windows, ni Docker Desktop, ni la configuration Git globale). Aucun droit administrateur,
aucun script téléchargé puis exécuté. Ne pas modifier `.claude/settings.json` ni `.claude/hooks/` : seul
l'utilisateur le fait.

## Méthode de travail

- **Chaque nouvelle demande** (évolution, correctif, idée) : **créer d'abord une issue GitHub** (titre
  `[Évolution] …` ou `[Correctif] …`, contexte, demande de l'utilisateur, points à préciser), donner son lien, puis
  **demander à l'utilisateur s'il faut la réaliser maintenant**. Aucun plan ni code avant sa réponse. La PR qui la
  réalise porte son numéro dans le titre (`#N — Ajoute …`) et la ferme (`Closes #N`).
- **Un lot à la fois** (§9). On ne commence pas le lot suivant tant que le lot courant n'est pas validé
  par l'utilisateur sur son téléphone (ou sur PC pour les lots 0 et 1).
- **Plan d'abord** : pour chaque lot, propose un plan (fichiers, étapes, critères §8 couverts) et **attends la
  validation** avant de coder. La commande `/lot N` fait cela.
- **Tests avant le code** pour le module de calcul : chaque cas de l'annexe §11 devient un test, écrit avant
  l'implémentation.
- **Fin de lot** : `/verifier` entièrement vert ; sous-agent `relecteur` **uniquement à la demande de
  l'utilisateur** (lui transmettre le numéro du lot et `git diff --name-only main...HEAD`) ; mise à jour de
  `README.md` ou du guide concerné, de `CHANGELOG.md` et de `docs/decisions/lot-N.md` ; `/version`.
- Messages de commit en français, à l'impératif (« Ajoute la saisie terrain »).
- Hook `formater.mjs` (après Edit/Write) : Prettier sur les `.ts/.tsx/.js/.json/.css` du projet, non bloquant.
- Hook `tests-calculs.mjs` (fin de tour) : si `server/src/calculs/` a changé, lance ses tests et **bloque la fin du
  tour en cas d'échec** : corrige le code, jamais l'annexe §11.

## Versions

- SemVer, source unique : `version` du `package.json` racine, affichée dans les Réglages.
- Lot 0 → `0.0.1` ; lot N validé → `0.N.0` ; correctifs → `0.N.1`… ; mise en ligne OVH validée → `1.0.0`.
- Chaque version : tag Git `vX.Y.Z` + entrée dans `CHANGELOG.md` (Ajouté / Modifié / Corrigé) + mise à jour de
  `docs/architecture.md` (schémas et ligne « À jour pour la version »).
- La PWA affiche « Nouvelle version disponible — Mettre à jour » quand une nouvelle version est déployée.

## Profil de l'utilisateur

Niveau **intermédiaire** : à l'aise avec un terminal, pas développeur. Toute commande à lancer par l'utilisateur
est **expliquée pas à pas** (où la taper, ce qu'elle fait, le résultat attendu). Réponds en **français**, de façon
**courte** (l'utilisateur l'a demandé). L'utilisateur est sous **Windows** (Git pour Windows installé) : donne les
commandes PowerShell quand elles diffèrent.
