# Décisions — Lot 0 — mise en place

[← Index des décisions](README.md)

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
