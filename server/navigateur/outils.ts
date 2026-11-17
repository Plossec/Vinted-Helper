// Outils des tests de l'interface dans un navigateur (#243, ADR-0108) : l'application construite (client/dist)
// servie par le vrai serveur sur une base PGlite en mémoire, pilotée dans Chromium. Ni Docker, ni la base de
// l'utilisateur, ni Gemini (client IA simulé), ni aucun appel vers l'extérieur.
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Browser, type BrowserContext, chromium, type Page } from "playwright-core";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { creerApp } from "../src/app.js";
import { amorcerCompte } from "../src/base/amorcage.js";
import { creerBaseDeTest, creerIASimulee, IDENTIFIANT_TEST, MOT_DE_PASSE_TEST } from "../src/test/outils.js";

const DOSSIER_CLIENT = resolve(import.meta.dirname, "..", "..", "client", "dist");

/**
 * Chromium : celui indiqué par VH_CHROME_TEST (CI, conteneurs), sinon celui de Playwright
 * (`npx playwright-core install chromium` une fois sur le PC).
 */
export async function lancerNavigateur(): Promise<Browser> {
  const chemin = process.env.VH_CHROME_TEST;
  try {
    return await chromium.launch(chemin ? { executablePath: chemin } : {});
  } catch (erreur) {
    throw new Error(
      "Chromium introuvable : lancez une fois « npx playwright-core install chromium », ou indiquez le chemin " +
        "du navigateur dans la variable VH_CHROME_TEST.",
      { cause: erreur },
    );
  }
}

/** Serveur complet sur une base vide (compte de test créé), à l'écoute sur un port libre de 127.0.0.1. */
export async function demarrerServeur() {
  if (!existsSync(join(DOSSIER_CLIENT, "index.html"))) {
    throw new Error(
      "Interface non construite : lancez d'abord « npm run build -w client » (ou npm run test:navigateur).",
    );
  }
  const { base, fermer } = await creerBaseDeTest();
  await amorcerCompte(base, () => ({ identifiant: IDENTIFIANT_TEST, motDePasse: MOT_DE_PASSE_TEST }));
  const dossierPhotos = mkdtempSync(join(tmpdir(), "vh-photos-"));
  const ia = creerIASimulee();
  const app = await creerApp({
    ia: ia.client,
    version: "test",
    base,
    verifierBase: async () => true,
    dossierPhotos,
    dossierClient: DOSSIER_CLIENT,
  });
  const adresse = await app.listen({ host: "127.0.0.1", port: 0 });
  return {
    adresse,
    base,
    ia,
    fermer: async () => {
      await app.close();
      await fermer();
      rmSync(dossierPhotos, { recursive: true, force: true });
    },
  };
}

/**
 * Onglet de téléphone (360 px, ADR interface) déjà connecté. Le service worker est bloqué : chaque test voit
 * l'interface servie, jamais un cache d'un test précédent.
 */
export async function ouvrirSession(
  navigateur: Browser,
  adresse: string,
): Promise<{ contexte: BrowserContext; page: Page }> {
  const contexte = await navigateur.newContext({
    baseURL: adresse,
    viewport: { width: 360, height: 780 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    serviceWorkers: "block",
  });
  const page = await contexte.newPage();
  page.setDefaultTimeout(10_000);
  const reponse = await page.request.post("/api/connexion", {
    data: { identifiant: IDENTIFIANT_TEST, motDePasse: MOT_DE_PASSE_TEST },
  });
  if (!reponse.ok()) throw new Error(`Connexion refusée (${reponse.status()}).`);
  return { contexte, page };
}

/** Liste déroulante avec saisie (ListeDeroulante) : tape le texte puis clique la première proposition qui le contient. */
export async function choisirDansListe(page: Page, libelle: string, texte: string) {
  await page.getByRole("combobox", { name: libelle }).fill(texte);
  await page
    .getByRole("listbox", { name: libelle.replace(/ \*$/, "") })
    .getByRole("option")
    .filter({ hasText: texte })
    .first()
    .click();
}

/** Petite photo JPEG fabriquée sur place (aucun fichier personnel). */
export function photoDeTest(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: "#3366cc" } })
    .jpeg()
    .toBuffer();
}

/** Sortie et achat créés par l'API (comme la file du téléphone) ; renvoie les identifiants des articles. */
export async function creerAchat(page: Page, { prixTotal, nombre = 1 }: { prixTotal: number; nombre?: number }) {
  const sortieId = randomUUID();
  const date = new Date().toISOString().slice(0, 10);
  const sortie = await page.request.post("/api/sorties", {
    data: { id: sortieId, date, lieuNom: "Brocante des tests", notes: null },
  });
  if (!sortie.ok()) throw new Error(`Sortie refusée (${sortie.status()}).`);
  const articleIds = Array.from({ length: nombre }, () => randomUUID());
  const achat = await page.request.post("/api/achats", {
    data: { id: randomUUID(), articleIds, sortieId, prixTotal, photoId: null, date },
  });
  if (!achat.ok()) throw new Error(`Achat refusé (${achat.status()}).`);
  return articleIds;
}

/**
 * Prépare chaque test d'un fichier : un navigateur pour le fichier, puis pour chaque test un serveur neuf (base vide)
 * et un onglet connecté. En cas d'échec, l'écran est décrit dans la sortie (arbre d'accessibilité) pour comprendre
 * sans rejouer le test.
 */
export function preparerParcours() {
  const etat = {} as { navigateur: Browser; serveur: Awaited<ReturnType<typeof demarrerServeur>>; page: Page };
  beforeAll(async () => {
    etat.navigateur = await lancerNavigateur();
  });
  afterAll(async () => {
    await etat.navigateur?.close();
  });
  beforeEach(async () => {
    etat.serveur = await demarrerServeur();
    etat.page = (await ouvrirSession(etat.navigateur, etat.serveur.adresse)).page;
  });
  afterEach(async ({ task }) => {
    if (task.result?.state === "fail") {
      const arbre = await etat.page
        .locator("body")
        .ariaSnapshot()
        .catch(() => "(écran illisible)");
      console.error(`Écran au moment de l'échec (${etat.page.url()}) :\n${arbre}`);
    }
    await etat.page.context().close();
    await etat.serveur.fermer();
  });
  return etat;
}

/** Passe un article « En ligne » au prix affiché donné (centimes), par l'API. */
export async function mettreEnLigne(page: Page, id: string, prixAffiche: number) {
  const r = await page.request.post(`/api/articles/${id}/statut`, { data: { vers: "en_ligne", prixAffiche } });
  if (!r.ok()) throw new Error(`Mise en ligne refusée (${r.status()}) : ${await r.text()}`);
}

/** Vente (groupée si plusieurs articles) enregistrée puis menée jusqu'à « Finalisé », par l'API. */
export async function vendreEtFinaliser(page: Page, articleIds: string[], montantCredite: number, emballage = 0) {
  const r = await page.request.post("/api/ventes", { data: { articleIds, montantCredite, emballage } });
  if (!r.ok()) throw new Error(`Vente refusée (${r.status()}) : ${await r.text()}`);
  const { id } = (await r.json()) as { id: string };
  for (const action of ["envoi", "finalisation"]) {
    const etape = await page.request.post(`/api/ventes/${id}/${action}`, { data: {} });
    if (!etape.ok()) throw new Error(`${action} refusé (${etape.status()}) : ${await etape.text()}`);
  }
}
