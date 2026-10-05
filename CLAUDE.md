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
| Arrêter | `docker compose down` |
| Journaux | `docker compose logs -f app` |
| Installer les dépendances | `npm install` |
| Tests | `npm test` |
| Tests du module de calcul seuls | `npm test -w server -- calculs` |
| Vérification des types | `npm run typecheck` |
| Lint | `npm run lint` |
| Formatage | `npm run format` |
| Générer une migration | `npm run db:generate -w server` |
| Appliquer les migrations | `npm run db:migrate -w server` (aussi automatique au démarrage) |
| Réinitialiser le mot de passe | `docker compose exec app npm run reset-password -w server` |

Les commandes sont créées au lot 0 ; garde ce tableau à jour si elles changent.

## Conventions

- **TypeScript strict** partout (`strict: true`, pas de `any` implicite).
- **Termes métier en français dans le code**, identiques au glossaire du cahier des charges (§3) :
  `sortie`, `lot`, `prix_achat`, `prix_affiche`, `prix_vendu`, `vente`, `colis`, `frais_general`…
  Le code technique (hooks, utilitaires) peut rester en anglais.
- **Montants en centimes (entiers)** : stockés, calculés et transmis en centimes ; convertis en euros
  **uniquement à l'affichage**. Jamais de `number` à virgule pour un montant.
- **Dates stockées en UTC**, affichées en **Europe/Paris** (`JJ/MM/AAAA`).
- **Interface 100 % en français**, format `3,33 €`, saisie acceptant la virgule ou le point.
- Chaque donnée (sauf l'utilisateur) porte un `utilisateur_id`.

## Règles non négociables

1. **Toute répartition** (lot, essence, emballage, prix vendu) passe par **une seule fonction** du module de calcul
   (`server/src/calculs/`), qui applique la règle d'arrondi du §6.
2. **Les parts calculées ne sont jamais stockées** en base : elles sont recalculées à partir des données.
3. **La clé Gemini reste côté serveur.** Jamais dans `client/`, jamais dans un log, jamais dans Git.
4. **Aucune automatisation de Vinted** (pas de scraping, pas de publication automatique).
5. **Rien de ce qui figure au §10 (hors périmètre) n'est développé** sans demande explicite de l'utilisateur.
6. **Ne jamais lire ni afficher `.env`.** Seul `.env.example` (sans secrets) est versionné.
7. **Une migration déjà appliquée n'est jamais modifiée** : on en crée une nouvelle.

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
- **Git** : `main` est toujours fonctionnelle. Un lot = une branche `lot-N`, fusionnée après validation.
  Messages de commit en français, à l'impératif (« Ajoute la saisie terrain »).

## Versions

- SemVer, source unique : `version` du `package.json` racine, affichée dans les Réglages.
- Lot 0 → `0.0.1` ; lot N validé → `0.N.0` ; correctifs → `0.N.1`… ; mise en ligne OVH validée → `1.0.0`.
- Chaque version : tag Git `vX.Y.Z` + entrée dans `CHANGELOG.md` (Ajouté / Modifié / Corrigé).
- La PWA affiche « Nouvelle version disponible — Mettre à jour » quand une nouvelle version est déployée.

## Profil de l'utilisateur

Niveau **intermédiaire** : à l'aise avec un terminal, pas développeur. Toute commande à lancer par l'utilisateur
est **expliquée pas à pas** (où la taper, ce qu'elle fait, le résultat attendu). Réponds en **français**.
L'utilisateur est sous **Windows** : donne les commandes pour PowerShell quand elles diffèrent.
