// Programme de publication Vinted (décision du 06/10/2026, docs/guides/publication-vinted.md).
// Tourne en tâche de fond sur le PC : toutes les 5 minutes, demande à l'application s'il y a des articles à publier ;
// si oui, ouvre Chrome (profil dédié), vérifie la connexion à Vinted, remplit le formulaire, contrôle, publie.
// Aucun contournement de détection : vérification Vinted, déconnexion ou champ inconnu → arrêt, sans publier.
//   node index.mjs               fonctionnement normal
//   node index.mjs --diagnostic  enregistre la liste des champs du formulaire Vinted (calibrage)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { creerApi } from "./api.mjs";
import { DOSSIER, DOSSIER_PHOTOS, journal, lireConfig, PROFIL_CHROME } from "./config.mjs";
import { controler, ErreurPublication, premier, remplir } from "./remplir.mjs";
import {
  ADRESSE_NOUVELLE_ANNONCE,
  BOUTON_AJOUTER,
  MOTIF_ANNONCE_CREEE,
  NON_CONNECTE,
  VERIFICATION,
} from "./selecteurs.mjs";

const args = new Set(process.argv.slice(2));
const UNE_FOIS = args.has("--une-fois"); // tests : s'arrête quand la file est vide
const ATTENTE_MS = Number(process.env.VH_ATTENTE_MS ?? 5 * 60_000);
const PAUSE_ESSAI_MS = Number(process.env.VH_PAUSE_ESSAI_MS ?? 20_000);
// Une seule publication toutes les 10 minutes (décision de l'utilisateur) ; les essais ne publient rien et s'enchaînent.
const PAUSE_ENTRE_ARTICLES_MS = Number(process.env.VH_PAUSE_MS ?? 10 * 60_000);
const PAUSE_APRES_ESSAI_MS = 5_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function ouvrirNavigateur() {
  const executable = process.env.VH_CHROME; // chemin de Chrome (sinon le Chrome installé sur le PC)
  return chromium.launchPersistentContext(PROFIL_CHROME, {
    headless: process.env.VH_HEADLESS === "1",
    viewport: null,
    ...(executable ? { executablePath: executable } : { channel: "chrome" }),
  });
}

/** État de la page Vinted : « verification » (captcha), « deconnecte » ou « pret ». */
async function etatPage(page) {
  if (await premier(page, VERIFICATION, 1500)) return "verification";
  if (await premier(page, NON_CONNECTE, 1500)) return "deconnecte";
  return "pret";
}

async function publierUne(page, api, demande) {
  const { article } = demande;
  journal(`#${String(article.reference).padStart(4, "0")} « ${article.titre} »${demande.essai ? " (essai)" : ""}…`);
  const fichiers = await api.telechargerPhotos(article.photos, DOSSIER_PHOTOS);
  await page.goto(ADRESSE_NOUVELLE_ANNONCE, { waitUntil: "domcontentloaded" });
  const etat = await etatPage(page);
  if (etat !== "pret") {
    throw new ErreurPublication(
      etat === "verification"
        ? "Vérification Vinted affichée : faites-la dans la fenêtre Chrome du programme, puis redemandez la publication."
        : "Non connecté à Vinted : connectez-vous dans la fenêtre Chrome du programme, puis redemandez la publication.",
    );
  }
  await remplir(page, article, fichiers);
  const ecarts = await controler(page, article, fichiers.length);
  if (ecarts.length > 0)
    throw new ErreurPublication(`Contrôle avant envoi : ${ecarts.join(" ; ")}. Rien n'a été publié.`);

  if (demande.essai) {
    journal("Essai : formulaire rempli et contrôlé, rien n'est publié.");
    await pause(PAUSE_ESSAI_MS);
    return { resultat: "essai" };
  }
  const bouton = await premier(page, BOUTON_AJOUTER);
  if (!bouton) throw new ErreurPublication("Bouton « Ajouter » introuvable (à calibrer). Rien n'a été publié.");
  await bouton.click();
  try {
    await page.waitForURL((url) => MOTIF_ANNONCE_CREEE.test(url.pathname) && !url.pathname.endsWith("/new"), {
      timeout: 60_000,
    });
  } catch {
    const raison = (await etatPage(page)) === "verification" ? "vérification Vinted affichée" : "pas de page d'annonce";
    throw new ErreurPublication(`Après « Ajouter » : ${raison}. Vérifiez sur Vinted si l'annonce existe.`);
  }
  journal(`Publié : ${page.url()}`);
  return { resultat: "publie", url: page.url() };
}

async function diagnostic(page) {
  await page.goto(ADRESSE_NOUVELLE_ANNONCE, { waitUntil: "domcontentloaded" });
  journal("Diagnostic : si besoin, connectez-vous dans la fenêtre Chrome. Relevé dans 20 secondes…");
  await pause(Number(process.env.VH_PAUSE_DIAGNOSTIC_MS ?? 20_000));
  const elements = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "input, textarea, select, button, label, [data-testid], [role=option], [role=combobox]",
      ),
    ]
      .slice(0, 800)
      .map((el) => ({
        balise: el.tagName.toLowerCase(),
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        id: el.id || null,
        testid: el.getAttribute("data-testid"),
        role: el.getAttribute("role"),
        placeholder: el.getAttribute("placeholder"),
        aria: el.getAttribute("aria-label"),
        texte: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || null,
      })),
  );
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const fichier = join(DOSSIER, `diagnostic-${horodatage}.json`);
  writeFileSync(fichier, JSON.stringify({ adresse: page.url(), etat: await etatPage(page), elements }, null, 2));
  await page.screenshot({ path: join(DOSSIER, `diagnostic-${horodatage}.png`), fullPage: true });
  journal(`Diagnostic enregistré : ${fichier} (et la capture .png). Envoyez ces deux fichiers à Claude.`);
}

async function principal() {
  const config = lireConfig();
  if (!config) {
    journal("Configuration absente : lancez scripts\\installer-publication.ps1 (adresse de l'application et jeton).");
    process.exit(1);
  }
  const api = creerApi(config);
  const contexte = await ouvrirNavigateur();
  const page = contexte.pages()[0] ?? (await contexte.newPage());

  if (args.has("--diagnostic")) {
    await diagnostic(page);
    await contexte.close();
    return;
  }

  journal(`Programme de publication démarré (application : ${config.adresse}).`);
  for (;;) {
    try {
      const nombre = await api.enAttente();
      if (nombre === 0) {
        if (UNE_FOIS) break;
        await pause(ATTENTE_MS);
        continue;
      }
      // Vérifier la connexion AVANT de prendre une demande (sinon elle resterait bloquée « en cours »).
      await page.goto(ADRESSE_NOUVELLE_ANNONCE, { waitUntil: "domcontentloaded" });
      const etat = await etatPage(page);
      if (etat !== "pret") {
        journal(
          etat === "verification"
            ? "Vérification Vinted affichée : faites-la dans la fenêtre Chrome du programme. Nouvel essai dans 30 s."
            : "Non connecté à Vinted : connectez-vous dans la fenêtre Chrome du programme. Nouvel essai dans 30 s.",
        );
        if (UNE_FOIS) break;
        await pause(30_000);
        continue;
      }
      const demande = await api.suivante();
      if (!demande) continue;
      let resultat;
      try {
        resultat = await publierUne(page, api, demande);
      } catch (erreur) {
        const message = erreur instanceof Error ? erreur.message : String(erreur);
        journal(`Erreur : ${message}`);
        resultat = { resultat: "erreur", message };
      }
      await api.resultat(demande.id, resultat);
      if (resultat.resultat !== "essai") journal("Prochaine publication possible dans 10 minutes.");
      await pause(
        resultat.resultat === "essai"
          ? Math.min(PAUSE_APRES_ESSAI_MS, PAUSE_ENTRE_ARTICLES_MS)
          : PAUSE_ENTRE_ARTICLES_MS,
      );
    } catch (erreur) {
      journal(`Problème : ${erreur instanceof Error ? erreur.message : erreur}. Nouvel essai dans 30 s.`);
      if (UNE_FOIS) break;
      await pause(30_000);
    }
  }
  await contexte.close();
}

await principal();
