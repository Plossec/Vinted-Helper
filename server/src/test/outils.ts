// Outils de test : vraie base PostgreSQL en mémoire (PGlite), migrations du projet, compte de test.
// Aucun accès à Docker ni à la base de l'utilisateur.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { creerApp } from "../app.js";
import { amorcerCompte } from "../base/amorcage.js";
import type { Base } from "../base/connexion.js";
import * as schema from "../base/schema.js";

export const IDENTIFIANT_TEST = "pascal";
export const MOT_DE_PASSE_TEST = "mot-de-passe-test";

/**
 * Base modèle migrée une seule fois par fichier de test, puis copiée pour chaque test (#130) : une copie prend
 * ~0,3 s au lieu de ~1,8 s pour rejouer toutes les migrations. Chaque test garde sa propre base, vide.
 */
let modele: Promise<File | Blob> | null = null;
function baseModele(): Promise<File | Blob> {
  modele ??= (async () => {
    const client = new PGlite();
    await migrate(drizzle(client, { schema }), {
      migrationsFolder: resolve(import.meta.dirname, "..", "..", "drizzle"),
    });
    const copie = await client.dumpDataDir("none");
    await client.close();
    return copie;
  })();
  return modele;
}

export async function creerBaseDeTest() {
  const client = new PGlite({ loadDataDir: await baseModele() });
  const base: Base = drizzle(client, { schema });
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
/** Client IA simulé : les tests n'appellent jamais réellement Gemini (quota gratuit). */
export function creerIASimulee() {
  const appels: { prompt: string; images: number }[] = [];
  let reponse: string | Error = '{"titre": "Titre simulé", "description": "Description simulée."}';
  return {
    appels,
    repondre: (r: string | Error) => {
      reponse = r;
    },
    client: {
      generer: async (prompt: string, images: readonly unknown[]) => {
        appels.push({ prompt, images: images.length });
        if (reponse instanceof Error) throw reponse;
        return reponse;
      },
    },
  };
}

export async function creerAppDeTest() {
  const { base, fermer } = await creerBaseDeTest();
  await amorcerCompte(base, () => ({ identifiant: IDENTIFIANT_TEST, motDePasse: MOT_DE_PASSE_TEST }));
  const horloge = creerHorloge();
  // Photos dans un dossier temporaire, effacé à la fin du test (jamais data/photos).
  const dossierPhotos = mkdtempSync(join(tmpdir(), "vh-photos-"));
  const ia = creerIASimulee();
  const app = await creerApp({
    ia: ia.client,
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
    ia,
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

/**
 * Complète l'annonce d'un article directement en base (#196 : le passage À publier exige un article complet) :
 * titre, description, couleur, prix affiché s'il manque, et une photo d'annonce (fichier non créé).
 */
export async function completerAnnonce(base: Base, articleId: string) {
  const [a] = await base
    .update(schema.article)
    .set({
      titreAnnonce: "Titre de test",
      descriptionAnnonce: "Description de test.",
      couleurs: ["bleu"],
      prixAffiche: sql`coalesce(${schema.article.prixAffiche}, 1000)`,
    })
    .where(eq(schema.article.id, articleId))
    .returning({ utilisateurId: schema.article.utilisateurId });
  if (!a) throw new Error("Article introuvable.");
  const photoId = randomUUID();
  await base
    .insert(schema.photo)
    .values({ id: photoId, utilisateurId: a.utilisateurId, type: "annonce", fichier: `${photoId}.jpg` });
  await base.insert(schema.articlePhoto).values({ articleId, photoId });
}
