# ADR-0004 — Lot 0 : choix techniques de mise en place

- **Date** : 05/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (dépendances) et Claude
- **Issue** : —
- **Thème** : Socle

[← Index des décisions](README.md)

## Décision

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
