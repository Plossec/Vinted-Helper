// Configuration de drizzle-kit (génération des migrations : npm run db:generate).
// Ne jamais utiliser « drizzle-kit push » : toute évolution de la base passe par un fichier de migration.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/base/schema.ts",
  out: "./drizzle",
});
