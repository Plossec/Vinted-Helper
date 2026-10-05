// Application des migrations Drizzle (au démarrage du serveur, ou via npm run db:migrate).
// Une migration déjà appliquée n'est jamais modifiée : on en crée une nouvelle.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Connexion } from "./connexion.js";

/** Applique les migrations en attente. Renvoie false s'il n'existe encore aucune migration (lot 0). */
export async function appliquerMigrations(connexion: Connexion, dossierMigrations: string): Promise<boolean> {
  if (!existsSync(join(dossierMigrations, "meta", "_journal.json"))) {
    return false;
  }
  await migrate(connexion.db, { migrationsFolder: dossierMigrations });
  return true;
}
