// Outils de test : vraie base PostgreSQL en mémoire (PGlite), migrations du projet, compte de test.
// Aucun accès à Docker ni à la base de l'utilisateur.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { creerApp } from "../app.js";
import { amorcerCompte } from "../base/amorcage.js";
import type { Base } from "../base/connexion.js";
import * as schema from "../base/schema.js";

export const IDENTIFIANT_TEST = "pascal";
export const MOT_DE_PASSE_TEST = "mot-de-passe-test";

export async function creerBaseDeTest() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, "..", "..", "drizzle") });
  const base: Base = db;
  return { base, fermer: () => client.close() };
}

/** Horloge réglable pour les tests. */
export function creerHorloge(depart = "2026-10-05T10:00:00.000Z") {
  let instant = new Date(depart).getTime();
  return {
    maintenant: () => new Date(instant),
    avancer: (millisecondes: number) => {
      instant += millisecondes;
    },
  };
}

/** Application complète sur une base en mémoire, avec le compte de test déjà créé. */
export async function creerAppDeTest() {
  const { base, fermer } = await creerBaseDeTest();
  await amorcerCompte(base, () => ({ identifiant: IDENTIFIANT_TEST, motDePasse: MOT_DE_PASSE_TEST }));
  const horloge = creerHorloge();
  // Photos dans un dossier temporaire, effacé à la fin du test (jamais data/photos).
  const dossierPhotos = mkdtempSync(join(tmpdir(), "vh-photos-"));
  const app = await creerApp({
    version: "test",
    base,
    verifierBase: async () => true,
    maintenant: horloge.maintenant,
    dossierPhotos,
  });
  return {
    app,
    base,
    horloge,
    dossierPhotos,
    fermer: async () => {
      await app.close();
      await fermer();
      rmSync(dossierPhotos, { recursive: true, force: true });
    },
  };
}

/** Se connecte et renvoie l'en-tête Cookie à joindre aux requêtes suivantes. */
export async function seConnecter(
  app: Awaited<ReturnType<typeof creerApp>>,
  motDePasse = MOT_DE_PASSE_TEST,
): Promise<string> {
  const reponse = await app.inject({
    method: "POST",
    url: "/api/connexion",
    payload: { identifiant: IDENTIFIANT_TEST, motDePasse },
  });
  if (reponse.statusCode !== 200) throw new Error(`Connexion refusée (${reponse.statusCode}) : ${reponse.body}`);
  const cookie = reponse.cookies.find((c) => c.name === "vh_session");
  if (!cookie) throw new Error("Aucun cookie de session reçu.");
  return `vh_session=${cookie.value}`;
}
