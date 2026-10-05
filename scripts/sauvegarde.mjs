// npm run db:sauvegarde : copie complète de la base (pg_dump) dans sauvegardes/AAAA-MM-JJ_HH-MM-SS.sql.
// À lancer avant toute migration. La base doit tourner (docker compose up -d).
// Les identifiants sont lus DANS le conteneur : aucun secret ne transite par ce script.
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const dossier = "sauvegardes";
mkdirSync(dossier, { recursive: true });

const d = new Date();
const deux = (n) => String(n).padStart(2, "0");
const horodatage = `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}_${deux(d.getHours())}-${deux(d.getMinutes())}-${deux(d.getSeconds())}`;
const fichier = join(dossier, `${horodatage}.sql`);

const sortie = createWriteStream(fichier);
const pgDump = spawn(
  "docker",
  ["compose", "exec", "-T", "db", "sh", "-c", 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner'],
  { stdio: ["ignore", "pipe", "inherit"] },
);
pgDump.stdout.pipe(sortie);

pgDump.on("error", (erreur) => {
  console.error(`Impossible de lancer Docker : ${erreur.message}`);
  process.exitCode = 1;
});

pgDump.on("close", (code) => {
  sortie.end(() => {
    if (code === 0 && statSync(fichier).size > 0) {
      console.log(`Sauvegarde créée : ${fichier}`);
    } else {
      unlinkSync(fichier);
      console.error("Échec de la sauvegarde. La base est-elle démarrée ? (docker compose up -d)");
      process.exitCode = 1;
    }
  });
});
