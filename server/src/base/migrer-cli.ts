// Commande « npm run db:migrate » : applique les migrations depuis le PC (base Docker sur localhost).
// Pensez à « npm run db:sauvegarde » avant toute migration.
import { config } from "../config.js";
import { creerConnexion } from "./connexion.js";
import { appliquerMigrations } from "./migrer.js";

const connexion = creerConnexion();
try {
  const appliquees = await appliquerMigrations(connexion, config.dossierMigrations);
  console.info(appliquees ? "Migrations appliquées." : "Aucune migration à appliquer pour l'instant.");
} catch (erreur) {
  console.error("Échec des migrations :", erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
} finally {
  await connexion.fermer();
}
