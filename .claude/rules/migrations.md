---
paths:
  - "server/drizzle/**"
  - "server/src/base/**"
  - "server/drizzle.config.ts"
---

# Règles de la base de données (schéma et migrations)

- La base n'évolue **que par migrations** : modifier `server/src/base/schema.ts`, puis
  `npx drizzle-kit generate --name <nom>` dans `server/` (`npm run db:generate` ne transmet pas `--name`).
  **Jamais `drizzle-kit push`**, jamais de `DROP` / `TRUNCATE` à la main.
- **Ne jamais modifier une migration déjà appliquée** (présente sur `main`) : en créer une nouvelle.
- Une migration générée qui supprime une table ou une colonne doit être **réécrite à la main dans un ordre sûr**
  (copier les données avant de supprimer) et testée sur des données existantes (voir `server/src/base/migrations.test.ts`).
- `npm run db:sauvegarde` (pg_dump) **avant d'appliquer** une migration sur une vraie base.
- Chaque table porte un `utilisateur_id` (sauf `utilisateur`). Montants en centimes (`integer`), dates en UTC
  (`timestamp with time zone`).
- Les parts calculées (lot, essence, emballage, prix vendu) ne sont **jamais stockées** en base.
