// Configuration du programme : dossier personnel (Windows : %LOCALAPPDATA%\VintedHelper), fichier publication.json
// { "adresse": "https://…", "jeton": "vh_…" }, profil Chrome dédié, journal.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DOSSIER =
  process.env.VH_DOSSIER ?? join(process.env.LOCALAPPDATA ?? join(homedir(), ".local", "share"), "VintedHelper");
export const FICHIER_CONFIG = join(DOSSIER, "publication.json");
export const PROFIL_CHROME = join(DOSSIER, "chrome");
export const DOSSIER_PHOTOS = join(DOSSIER, "photos-en-cours");
const JOURNAL = join(DOSSIER, "publication.log");

mkdirSync(DOSSIER, { recursive: true });

/** Écrit un message horodaté dans la console et dans le journal. */
export function journal(message) {
  const ligne = `${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} — ${message}`;
  console.log(ligne);
  try {
    appendFileSync(JOURNAL, `${ligne}\n`);
  } catch {
    // Journal facultatif.
  }
}

export function lireConfig() {
  if (!existsSync(FICHIER_CONFIG)) return null;
  // Fichier écrit par PowerShell : on ignore une éventuelle marque BOM en tête.
  const config = JSON.parse(readFileSync(FICHIER_CONFIG, "utf8").replace(/^\uFEFF/, ""));
  if (typeof config.adresse !== "string" || typeof config.jeton !== "string") return null;
  return { adresse: config.adresse.replace(/\/+$/, ""), jeton: config.jeton };
}

export function ecrireConfig(adresse, jeton) {
  writeFileSync(FICHIER_CONFIG, JSON.stringify({ adresse: adresse.replace(/\/+$/, ""), jeton }, null, 2));
}
