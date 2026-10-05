// Point d'entrée du serveur : migrations, création du compte au premier démarrage, puis application.
import { creerApp } from "./app.js";
import { amorcerCompte } from "./base/amorcage.js";
import { creerConnexion } from "./base/connexion.js";
import { appliquerMigrations } from "./base/migrer.js";
import { config } from "./config.js";

const connexion = creerConnexion();

try {
  const appliquees = await appliquerMigrations(connexion, config.dossierMigrations);
  console.info(appliquees ? "Migrations appliquées." : "Aucune migration à appliquer pour l'instant.");
  const cree = await amorcerCompte(connexion.db, () => ({
    identifiant: process.env.COMPTE_IDENTIFIANT ?? "",
    motDePasse: process.env.COMPTE_MOT_DE_PASSE_INITIAL ?? "",
  }));
  if (cree) console.info("Premier démarrage : compte créé à partir du fichier .env, listes de référence pré-remplies.");
} catch (erreur) {
  console.error("Échec au démarrage :", erreur instanceof Error ? erreur.message : erreur);
  await connexion.fermer();
  process.exit(1);
}

const app = await creerApp({
  version: config.version,
  base: connexion.db,
  verifierBase: connexion.verifier,
  dossierClient: config.dossierClient,
  journaliser: true,
});

async function arreter(signal: string): Promise<void> {
  console.info(`Signal ${signal} reçu : arrêt propre.`);
  await app.close();
  await connexion.fermer();
  process.exit(0);
}
process.on("SIGTERM", () => void arreter("SIGTERM"));
process.on("SIGINT", () => void arreter("SIGINT"));

await app.listen({ host: "0.0.0.0", port: config.port });
console.info(`Vinted Helper ${config.version} démarré sur le port ${config.port}.`);
