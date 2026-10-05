// Configuration lue dans les variables d'environnement (fichier .env, ou docker-compose).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Version de l'application : source unique = package.json racine. */
function lireVersion(): string {
  // src/config.ts (dév.) et dist/config.js (Docker) sont tous deux à deux niveaux de la racine.
  const chemin = resolve(import.meta.dirname, "..", "..", "package.json");
  const contenu: unknown = JSON.parse(readFileSync(chemin, "utf8"));
  if (typeof contenu === "object" && contenu !== null && "version" in contenu && typeof contenu.version === "string") {
    return contenu.version;
  }
  throw new Error(`Version introuvable dans ${chemin}`);
}

function lireEntier(nom: string, defaut: number): number {
  const brut = process.env[nom];
  if (brut === undefined || brut === "") return defaut;
  const valeur = Number(brut);
  if (!Number.isInteger(valeur) || valeur <= 0) throw new Error(`Variable ${nom} invalide : « ${brut} »`);
  return valeur;
}

function lireTexte(nom: string): string {
  const valeur = process.env[nom];
  if (valeur === undefined || valeur === "") {
    throw new Error(`Variable ${nom} manquante : vérifiez votre fichier .env (voir .env.example).`);
  }
  return valeur;
}

/** Adresse de connexion à PostgreSQL, construite à partir des variables POSTGRES_*. */
export function adresseBase(): string {
  const utilisateur = encodeURIComponent(lireTexte("POSTGRES_USER"));
  const motDePasse = encodeURIComponent(lireTexte("POSTGRES_PASSWORD"));
  const base = encodeURIComponent(lireTexte("POSTGRES_DB"));
  // Dans Docker, l'hôte est le service « db » ; sur le PC (scripts locaux), c'est localhost.
  const hote = process.env.POSTGRES_HOTE || "localhost";
  const port = lireEntier("POSTGRES_PORT", 5432);
  return `postgres://${utilisateur}:${motDePasse}@${hote}:${port}/${base}`;
}

export const config = {
  version: lireVersion(),
  port: lireEntier("PORT", 3000),
  /** Dossier des fichiers de l'interface compilée (client/dist). */
  dossierClient: resolve(import.meta.dirname, "..", "..", "client", "dist"),
  /** Dossier des migrations Drizzle (server/drizzle). */
  dossierMigrations: resolve(import.meta.dirname, "..", "drizzle"),
};
