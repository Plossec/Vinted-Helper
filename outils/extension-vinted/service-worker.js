// Service worker de l'extension Vinted Helper (décision du 07/10/2026, docs/guides/publication-vinted.md).
// Toutes les 5 minutes : demande à l'application s'il y a des annonces à publier ; si oui, ouvre « Vendre un article »
// dans le Chrome habituel de l'utilisateur (sa propre session Vinted), fait remplir le formulaire par le script de
// contenu, contrôle, publie. Une annonce au plus toutes les 10 minutes, plus un délai aléatoire.
// Aucun contournement : vérification, page de blocage ou déconnexion → PAUSE, reprise uniquement à la main.

/* global SELECTEURS */
importScripts("selecteurs.js");

const VINTED_DEFAUT = "https://www.vinted.fr";
const PERIODE_MINUTES = 5;
const PAUSE_ENTRE_ARTICLES_MS = 10 * 60_000;
const PAUSE_ALEATOIRE_MS = 3 * 60_000;
const ATTENTE_ANNONCE_MS = 60_000;
const TAILLE_JOURNAL = 30;

const attendreMs = (ms) => new Promise((r) => setTimeout(r, ms));

/** Arrêt qui met l'extension en pause (vérification, blocage, déconnexion, jeton refusé). */
class Arret extends Error {}

const RAISONS = {
  bloque:
    "Vinted a bloqué la session. L'extension est en pause : ne reprenez pas avant plusieurs jours, et publiez à la main en attendant.",
  verification:
    "Vérification Vinted affichée : faites-la vous-même dans l'onglet Vinted, puis cliquez « Reprendre » dans l'extension.",
  deconnecte: "Non connecté à Vinted : connectez-vous dans Chrome, puis cliquez « Reprendre » dans l'extension.",
  inconnu:
    "Page Vinted inattendue (l'extension ne peut pas la lire). Vérifiez l'onglet Vinted, puis cliquez « Reprendre ».",
};

// --- État (chrome.storage.local) ---

const ETAT_INITIAL = { pause: false, raison: null, prochain: 0, enCours: null, onglet: null, journal: [] };

async function lire() {
  const {
    config = null,
    etat = {},
    vinted = VINTED_DEFAUT,
  } = await chrome.storage.local.get(["config", "etat", "vinted"]);
  return { config, etat: { ...ETAT_INITIAL, ...etat }, vinted };
}

async function ecrireEtat(modifications) {
  const { etat } = await lire();
  await chrome.storage.local.set({ etat: { ...etat, ...modifications } });
}

async function journal(texte) {
  const { etat } = await lire();
  const ligne = { date: new Date().toISOString(), texte };
  await ecrireEtat({ journal: [ligne, ...etat.journal].slice(0, TAILLE_JOURNAL) });
}

async function majBadge(occupe = false) {
  const { config, etat } = await lire();
  const [texte, couleur] = !config
    ? ["?", "#888888"]
    : etat.pause
      ? ["!", "#c62828"]
      : occupe
        ? ["…", "#0b7a75"]
        : ["", "#0b7a75"];
  await chrome.action.setBadgeText({ text: texte });
  await chrome.action.setBadgeBackgroundColor({ color: couleur });
}

async function mettreEnPause(raison) {
  await ecrireEtat({ pause: true, raison });
  await journal(`Pause : ${raison}`);
  await majBadge();
  chrome.notifications?.create("vh-pause", {
    type: "basic",
    iconUrl: "icone-128.png",
    title: "Vinted Helper : publication en pause",
    message: raison,
    priority: 2,
  });
}

// --- Application Vinted Helper (jeton « Bearer », aucune requête vers Vinted ici) ---

function creerApi({ adresse, jeton }) {
  const appeler = async (chemin, options = {}) => {
    const reponse = await fetch(`${adresse}${chemin}`, {
      ...options,
      headers: { authorization: `Bearer ${jeton}`, "content-type": "application/json", ...options.headers },
    });
    if (reponse.status === 401)
      throw new Arret(
        "Jeton refusé : créez-en un nouveau (Réglages → Publication Vinted) et saisissez-le dans les options.",
      );
    if (!reponse.ok) throw new Error(`Application : erreur ${reponse.status}`);
    return reponse;
  };
  return {
    async enAttente() {
      return (await (await appeler("/api/programme/attente")).json()).nombre;
    },
    async suivante() {
      return (await (await appeler("/api/programme/suivante")).json()).publication;
    },
    async resultat(id, corps) {
      await appeler(`/api/programme/publications/${id}/resultat`, { method: "POST", body: JSON.stringify(corps) });
    },
    /** Photos dans l'ordre, encodées pour être transmises au script de contenu. */
    async photos(liens) {
      const photos = [];
      for (const [i, lien] of liens.entries()) {
        const reponse = await appeler(lien, { headers: { "content-type": "" } });
        const type = reponse.headers.get("content-type") ?? "image/jpeg";
        const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
        const octets = new Uint8Array(await reponse.arrayBuffer());
        let binaire = "";
        for (let j = 0; j < octets.length; j += 0x8000)
          binaire += String.fromCharCode(...octets.subarray(j, j + 0x8000));
        photos.push({ nom: `${String(i + 1).padStart(2, "0")}.${extension}`, type, base64: btoa(binaire) });
      }
      return photos;
    },
  };
}

// --- Onglet Vinted ---

/** Ouvre (ou réutilise) l'onglet de l'extension sur cette adresse et attend la fin du chargement. */
async function ouvrirOnglet(url) {
  const { etat } = await lire();
  let onglet = null;
  if (etat.onglet !== null) onglet = await chrome.tabs.get(etat.onglet).catch(() => null);
  onglet = onglet
    ? await chrome.tabs.update(onglet.id, { url, active: true })
    : await chrome.tabs.create({ url, active: true });
  await ecrireEtat({ onglet: onglet.id });
  await attendreMs(500);
  const fin = Date.now() + 30_000;
  while (Date.now() < fin) {
    const t = await chrome.tabs.get(onglet.id);
    if (t.status === "complete") return onglet.id;
    await attendreMs(500);
  }
  throw new Error("La page Vinted ne se charge pas.");
}

/** Message au script de contenu (réessayé le temps qu'il se charge). Null s'il ne répond pas. */
async function envoyer(onglet, message) {
  for (let essai = 0; essai < 20; essai++) {
    try {
      return await chrome.tabs.sendMessage(onglet, message);
    } catch {
      await attendreMs(500);
    }
  }
  return null;
}

async function etatOnglet(onglet) {
  return (await envoyer(onglet, { type: "etat" }))?.etat ?? "inconnu";
}

// --- Publication ---

async function publier(onglet, api, demande) {
  const { article } = demande;
  const photos = await api.photos(article.photos);
  const r = await envoyer(onglet, { type: "remplir", article, photos });
  if (!r) throw new Arret(RAISONS.inconnu);
  if (r.etat) throw new Arret(RAISONS[r.etat] ?? RAISONS.inconnu);
  if (!r.ok) throw new Error(r.message);
  if (demande.essai) return { resultat: "essai" };

  const clic = await envoyer(onglet, { type: "ajouter" });
  if (!clic?.ok) throw new Error(clic?.message ?? "Clic sur « Ajouter » impossible. Rien n'a été publié.");
  const motif = new RegExp(SELECTEURS.motifAnnonceCreee);
  const fin = Date.now() + ATTENTE_ANNONCE_MS;
  while (Date.now() < fin) {
    await attendreMs(1000);
    const t = await chrome.tabs.get(onglet);
    if (t.url && motif.test(new URL(t.url).pathname) && !new URL(t.url).pathname.endsWith("/new"))
      return { resultat: "publie", url: t.url };
  }
  const etat = await etatOnglet(onglet);
  if (etat !== "pret") throw new Arret(RAISONS[etat] ?? RAISONS.inconnu);
  throw new Error("Après « Ajouter » : pas de page d'annonce. Vérifiez sur Vinted si l'annonce existe.");
}

async function cycleSansVerrou() {
  const { config, etat, vinted } = await lire();
  if (!config) return;
  const api = creerApi(config);

  // Une publication interrompue (Chrome fermé, extension rechargée) n'est jamais reprise automatiquement.
  if (etat.enCours) {
    await api.resultat(etat.enCours, {
      resultat: "erreur",
      message:
        "Publication interrompue (Chrome fermé ou extension rechargée). Vérifiez sur Vinted si l'annonce existe.",
    });
    await ecrireEtat({ enCours: null });
  }
  if (etat.pause) return;

  const nombre = await api.enAttente(); // signale aussi à l'application que l'extension est active
  if (nombre === 0 || Date.now() < etat.prochain) return;

  // Vérifier la page AVANT de prendre une demande (sinon elle resterait « en cours »).
  const onglet = await ouvrirOnglet(`${vinted}/items/new`);
  const etatPage = await etatOnglet(onglet);
  if (etatPage !== "pret") throw new Arret(RAISONS[etatPage] ?? RAISONS.inconnu);

  const demande = await api.suivante();
  if (!demande) return;
  await ecrireEtat({ enCours: demande.id });
  const reference = `#${String(demande.article.reference).padStart(4, "0")}`;
  await journal(`${reference} « ${demande.article.titre} »${demande.essai ? " (essai)" : ""}…`);

  let resultat;
  let arret = null;
  try {
    resultat = await publier(onglet, api, demande);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    resultat = { resultat: "erreur", message };
    if (erreur instanceof Arret) arret = message;
  }
  await api.resultat(demande.id, resultat);
  await ecrireEtat({
    enCours: null,
    prochain:
      resultat.resultat === "essai"
        ? 0
        : Date.now() + PAUSE_ENTRE_ARTICLES_MS + Math.round(Math.random() * PAUSE_ALEATOIRE_MS),
  });
  await journal(
    resultat.resultat === "publie"
      ? `${reference} publié : ${resultat.url}`
      : resultat.resultat === "essai"
        ? `${reference} : essai, formulaire rempli et contrôlé, rien n'est publié.`
        : `${reference} : erreur — ${resultat.message}`,
  );
  if (arret) await mettreEnPause(arret);
}

let occupe = false;

/** Un passage : appelé par l'alarme, par « Vérifier maintenant » et par les tests. */
async function cycle() {
  if (occupe) return;
  occupe = true;
  await majBadge(true);
  try {
    await cycleSansVerrou();
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    if (erreur instanceof Arret) await mettreEnPause(message);
    else await journal(`Problème : ${message}. Nouvel essai dans ${PERIODE_MINUTES} minutes.`);
  } finally {
    occupe = false;
    await majBadge();
  }
}

// --- Évènements ---

async function preparerAlarme() {
  if (!(await chrome.alarms.get("cycle"))) await chrome.alarms.create("cycle", { periodInMinutes: PERIODE_MINUTES });
  await majBadge();
}

chrome.runtime.onInstalled.addListener(() => void preparerAlarme());
chrome.runtime.onStartup.addListener(() => void preparerAlarme());
chrome.alarms.onAlarm.addListener((alarme) => {
  if (alarme.name === "cycle") void cycle();
});

/** Actions de la fenêtre de l'extension (popup) et de la page d'options. */
async function action(message) {
  switch (message.type) {
    case "reprendre":
      await ecrireEtat({ pause: false, raison: null });
      await journal("Reprise demandée par l'utilisateur.");
      void cycle();
      return { ok: true };
    case "pause":
      await mettreEnPause("Pause demandée par l'utilisateur.");
      return { ok: true };
    case "maintenant":
      void cycle();
      return { ok: true };
    case "tester": {
      const { config } = await lire();
      if (!config) return { ok: false, message: "Adresse et jeton à saisir." };
      try {
        const nombre = await creerApi(config).enAttente();
        await majBadge();
        return { ok: true, message: `Connexion réussie : ${nombre} annonce(s) en attente.` };
      } catch (erreur) {
        return { ok: false, message: erreur instanceof Error ? erreur.message : String(erreur) };
      }
    }
    default:
      return { ok: false, message: "Action inconnue." };
  }
}

chrome.runtime.onMessage.addListener((message, expediteur, repondre) => {
  // Seules les pages de l'extension (fenêtre, réglages) la commandent, jamais les scripts de contenu.
  if (!expediteur.url?.startsWith(chrome.runtime.getURL(""))) return false;
  action(message).then(repondre);
  return true;
});

void preparerAlarme();
