# Vinted Helper — Instructions pour Claude

## Le projet

Application web installable (PWA) pour un revendeur amateur sur Vinted : saisie rapide des achats en vide-grenier,
gestion du stock et des statuts, ventes (simples, groupées, retours), calcul du bénéfice, tableau de bord, rédaction
d'annonces par IA (Gemini). Un seul utilisateur en V1, données préparées pour plusieurs utilisateurs.
Développement local (PC Windows + Docker Desktop), puis hébergement sur un VPS OVH.

**`docs/cahier-des-charges.md` fait foi.** En cas d'ambiguïté ou de contradiction, **pose la question à
l'utilisateur plutôt que de supposer**. Toute décision prise en cours de route est consignée dans `docs/decisions.md`.

## Commandes

| Action | Commande |
|---|---|
| Démarrer (application + PostgreSQL) | `docker compose up -d --build` |
| Arrêter (sans effacer les données) | `docker compose stop` |
| Journaux | `docker compose logs -f app` |
| Installer les dépendances (lockfile) | `npm ci` |
| Développement (hors Docker, base Docker démarrée) | `npm run dev:server` + `npm run dev:client` (http://localhost:5173) |
| Construire client + serveur | `npm run build` |
| Tests | `npm test` |
| Tests du module de calcul seuls | `npm test -w server -- calculs` |
| Vérification des types | `npm run typecheck` |
| Lint | `npm run lint` |
| Formatage | `npm run format` (vérifier sans modifier : `npm run format:check`) |
| Sauvegarder la base (pg_dump) | `npm run db:sauvegarde` |
| Générer une migration | `npm run db:generate` |
| Appliquer les migrations | `npm run db:migrate` (aussi automatique au démarrage) |
| Réinitialiser le mot de passe | *(lot 1)* `docker compose exec app npm run reset-password -w server` |

Garde ce tableau à jour si les commandes changent. Arborescence : `server/` (API, base, `src/calculs/`),
`client/` (interface React), `scripts/`, `docs/`. Migrations Drizzle dans `server/drizzle/`.

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
4. **Aucune automatisation de Vinted** et **aucune requête vers Vinted**.
5. **Rien de ce qui figure au §10 (hors périmètre) n'est développé** sans demande explicite.

## Garde-fous

Les interdictions techniques sont dans `.claude/settings.json` (appliquées par Claude Code, quoi que tu décides).
Les consignes ci-dessous complètent ces interdictions : respecte-les même quand rien ne t'en empêche techniquement.

**Données**
- Ne jamais supprimer les volumes Docker, le dossier des photos ou la base de données.
- `npm run db:sauvegarde` (pg_dump) **avant toute migration**.
- La base n'évolue que par migrations : `drizzle-kit generate` puis `migrate`. **Jamais `drizzle-kit push`.**
- Ne jamais modifier une migration déjà appliquée : en créer une nouvelle.
- Travailler uniquement sur la base locale de développement. **Aucune commande vers le VPS** sans demande explicite.

**Secrets**
- Ne jamais lire, afficher ni commiter `.env`. `.env.example` ne contient que des valeurs fictives.
- Aucun secret dans le code, les logs, les tests ou les messages de commit.

**Git**
- Travailler sur la branche `lot-N`, **jamais directement sur `main`**.
- **Aucun push sans demande.** Ne jamais réécrire l'historique ni contourner les vérifications (`--no-verify`).
- Commits **petits et fréquents** : c'est le filet de sécurité.

**Code et tests**
- Ne jamais modifier un test de l'annexe §11 pour le faire passer : corriger le code, ou **signaler le désaccord**.
- Ne jamais désactiver ni sauter un test (`.skip`, `.only`, test commenté).
- Pas de `any`, `@ts-ignore`, `@ts-expect-error` ou `eslint-disable` pour contourner une erreur.
- Les tests **n'appellent jamais réellement Gemini** : réponse simulée, pour préserver le quota gratuit.

**Dépendances**
- Toute nouvelle dépendance est **proposée avec sa justification** avant d'être installée.
- **npm uniquement**, aucune installation globale, `package-lock.json` toujours commité.
- Aucun script destructeur (reset de base, suppression de données) dans `package.json`.

**Périmètre et système**
- Un lot à la fois, rien du §10, **aucune refonte non demandée**.
- Ne rien modifier en dehors du dossier du projet : ni Windows, ni Docker Desktop, ni la configuration Git globale.
- Aucun droit administrateur, aucun script téléchargé puis exécuté.
- Ne pas modifier `.claude/settings.json` ni `.claude/hooks/` : seul l'utilisateur le fait.

## Méthode de travail

- **Un lot à la fois** (§9). On ne commence pas le lot suivant tant que le lot courant n'est pas validé
  par l'utilisateur sur son téléphone (ou sur PC pour les lots 0 et 1).
- **Plan d'abord** : pour chaque lot, propose un plan (fichiers, étapes, critères §8 couverts) et **attends la
  validation** avant de coder. La commande `/lot N` fait cela.
- **Tests avant le code** pour le module de calcul : chaque cas de l'annexe §11 devient un test, écrit avant
  l'implémentation.
- **Fin de lot** :
  1. `/verifier` doit être entièrement vert ;
  2. lancer le sous-agent `relecteur` et traiter ses remarques ;
  3. mettre à jour `README.md`, `CHANGELOG.md` et `docs/decisions.md` ;
  4. `/version` pour numéroter la version.
- Messages de commit en français, à l'impératif (« Ajoute la saisie terrain »).
- Sous-agent `relecteur` (lecture seule) : **uniquement à la demande de l'utilisateur**, en fin de lot ; lui transmettre le numéro du lot et `git diff --name-only main...HEAD`.
- Hook `formater.mjs` (après Edit/Write) : Prettier sur les `.ts/.tsx/.js/.json/.css` du projet, non bloquant.
- Hook `tests-calculs.mjs` (fin de tour) : si `server/src/calculs/` a changé, lance ses tests et **bloque la fin du tour en cas d'échec** : corrige le code, jamais l'annexe §11.

## Versions

- SemVer, source unique : `version` du `package.json` racine, affichée dans les Réglages.
- Lot 0 → `0.0.1` ; lot N validé → `0.N.0` ; correctifs → `0.N.1`… ; mise en ligne OVH validée → `1.0.0`.
- Chaque version : tag Git `vX.Y.Z` + entrée dans `CHANGELOG.md` (Ajouté / Modifié / Corrigé).
- La PWA affiche « Nouvelle version disponible — Mettre à jour » quand une nouvelle version est déployée.

## Profil de l'utilisateur

Niveau **intermédiaire** : à l'aise avec un terminal, pas développeur. Toute commande à lancer par l'utilisateur
est **expliquée pas à pas** (où la taper, ce qu'elle fait, le résultat attendu). Réponds en **français**.
L'utilisateur est sous **Windows** (Git pour Windows installé) : donne les commandes PowerShell quand elles diffèrent.
