// Service worker de l'extension Vinted Helper (décision du 07/10/2026, docs/guides/publication-vinted.md).
// Toutes les 5 minutes : demande à l'application s'il y a des annonces à publier ; si oui, ouvre « Vendre un article »
// dans le Chrome habituel de l'utilisateur (sa propre session Vinted), fait remplir le formulaire par le script de
// contenu étape par étape (5 s entre chaque), contrôle, publie. Une annonce au plus toutes les 10 minutes.
// Délais fixes, pour espacer les publications et laisser les pages se charger, jamais pour paraître humain (#136).
// Aucun contournement : vérification, page de blocage ou déconnexion → PAUSE, reprise uniquement à la main.
// Tâches automatiques (#147) : sans annonce à publier (la publication passe d'abord), l'extension demande l'action
// suivante (baisse de prix ou republication d'un article dormant) ; l'application règle les pauses entre actions.
// Cette version ne fait les actions qu'en MODE ESSAI : elle ouvre et relève les pages, sans rien modifier.
// Vérification vente finalisée (#148) : après la publication et avant les actions, lecture du « Porte-monnaie » quand l'application la demande ; cette version ne fait que l'ouvrir et la relever (essai).

/* global SELECTEURS */
importScripts("selecteurs.js");

const VINTED_DEFAUT = "https://www.vinted.fr";
const PERIODE_MINUTES = 5;
const PAUSE_ENTRE_ARTICLES_MS = 10 * 60_000;
const ATTENTE_ANNONCE_MS = 60_000;
const TAILLE_JOURNAL = 30;
/** Pause fixe entre deux étapes du remplissage (issue #57 ; 5 s depuis #63) : laisse la page réagir. */
const DELAI_ETAPE_MS = 5_000;
const ETAPES = ["photos", "titre", "description", "categorie", "marque", "taille", "etat", "couleurs", "prix", "colis"];

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

const ETAT_INITIAL = {
  pause: false,
  raison: null,
  prochain: 0,
  enCours: null,
  actionEnCours: null,
  onglet: null,
  journal: [],
};

async function lire() {
  // « vinted » et « delaiEtape » ne sont changés que par les tests (page factice locale, délais courts).
  const {
    config = null,
    etat = {},
    vinted = VINTED_DEFAUT,
    delaiEtape = DELAI_ETAPE_MS,
  } = await chrome.storage.local.get(["config", "etat", "vinted", "delaiEtape"]);
  return { config, etat: { ...ETAT_INITIAL, ...etat }, vinted, delaiEtape };
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
    /** Annonces à publier, actions des tâches automatiques (#147) et lecture des commandes (#148) à faire. */
    async attente() {
      const r = await (await appeler("/api/programme/attente")).json();
      return { nombre: r.nombre, actions: r.actions ?? 0, lectureCommandes: r.lectureCommandes === true };
    },
    async commandes(corps) {
      await appeler("/api/programme/commandes", { method: "POST", body: JSON.stringify(corps) });
    },
    async actionSuivante() {
      return (await (await appeler("/api/programme/action-suivante")).json()).action;
    },
    async resultatAction(id, corps) {
      await appeler(`/api/programme/actions/${id}/resultat`, { method: "POST", body: JSON.stringify(corps) });
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

/** Attente en gardant l'œil sur l'onglet (et le service worker éveillé) : erreur si l'utilisateur le ferme. */
async function patienter(onglet, ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    await attendreMs(Math.min(1000, fin - Date.now()));
    if (!(await chrome.tabs.get(onglet).catch(() => null)))
      throw new Error("Onglet Vinted fermé pendant le remplissage. Rien n'a été publié.");
  }
}

async function pauseEntreEtapes(onglet) {
  const { delaiEtape } = await lire();
  await patienter(onglet, delaiEtape);
}

/** Une étape du remplissage, demandée au script de contenu (qui vérifie d'abord la page). */
async function etape(onglet, message) {
  const r = await envoyer(onglet, { type: "etape", ...message });
  if (!r) throw new Arret(RAISONS.inconnu);
  if (r.etat) throw new Arret(RAISONS[r.etat] ?? RAISONS.inconnu);
  if (!r.ok) {
    if (r.releve) {
      await chrome.storage.local.set({ diagnostic: r.releve });
      await journal("Relevé de la page enregistré : fenêtre de l'extension → « Dernier relevé ».");
    }
    throw new Error(r.message);
  }
}

async function publier(onglet, api, demande) {
  const { article } = demande;
  const photos = await api.photos(article.photos);
  for (const [i, nom] of ETAPES.entries()) {
    if (i > 0) await pauseEntreEtapes(onglet);
    await etape(onglet, { nom, article, photos: nom === "photos" ? photos : undefined });
  }
  await pauseEntreEtapes(onglet);
  await etape(onglet, { nom: "controle", article, nombrePhotos: photos.length });
  if (demande.essai) return { resultat: "essai" };

  await pauseEntreEtapes(onglet);
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

// --- Tâches automatiques (#147) ---

/** Page Vinted prête (ni vérification, ni blocage, ni déconnexion), sinon pause. */
async function verifierPage(onglet) {
  const etat = await etatOnglet(onglet);
  if (etat !== "pret") throw new Arret(RAISONS[etat] ?? RAISONS.inconnu);
}

/** Relevé d'une page, demandé au script de contenu. */
async function releverPage(onglet, nom) {
  const r = await envoyer(onglet, { type: "releve-page", nom });
  if (!r) throw new Arret(RAISONS.inconnu);
  if (r.etat) throw new Arret(RAISONS[r.etat] ?? RAISONS.inconnu);
  return r.releve;
}

const LIBELLES_ACTION = {
  baisse: (a) => `baisse ${a.prixAvant} € → ${a.prixApres} €`,
  republication: (a) => `republication (${a.prixAvant} €)`,
};

/**
 * Action en mode essai : ouvre l'annonce et relève la page (boutons « Modifier », « Supprimer »), puis
 * - baisse : ouvre « Modifier l'annonce » et lit le prix affiché, sans rien saisir ;
 * - republication : remplit le formulaire « Vendre un article » avec l'annonce, sans cliquer « Ajouter ».
 * Les relevés sont enregistrés (« Dernier relevé ») pour calibrer le mode réel. Rien n'est modifié sur Vinted.
 */
async function executerAction(api, action, vinted) {
  if (!action.essai)
    return {
      resultat: "erreur",
      message:
        "Mode réel des tâches pas encore disponible dans cette version de l'extension (calibrage à faire) : laissez « Mode essai » coché (Réglages → Tâches automatiques).",
    };
  const id = /\/items\/(\d+)/.exec(new URL(action.url).pathname)?.[1];
  if (!id) return { resultat: "erreur", message: `Lien d'annonce illisible : ${action.url}` };
  const pages = {};
  const enregistrer = async (erreur = null) => {
    const derniere = pages.modifier ?? pages.annonce ?? {};
    await chrome.storage.local.set({
      diagnostic: {
        ...derniere,
        date: new Date().toISOString(),
        etape: `tâche : ${action.type}`,
        erreur,
        pages,
      },
    });
    await journal("Relevé des pages Vinted enregistré : fenêtre de l'extension → « Dernier relevé ».");
  };
  let onglet = await ouvrirOnglet(`${vinted}/items/${id}`);
  await verifierPage(onglet);
  pages.annonce = await releverPage(onglet, "annonce");
  await pauseEntreEtapes(onglet);
  if (action.type === "baisse") {
    onglet = await ouvrirOnglet(`${vinted}/items/${id}/edit`);
    await verifierPage(onglet);
    const r = await envoyer(onglet, { type: "lire-prix" });
    if (!r) throw new Arret(RAISONS.inconnu);
    if (r.etat) throw new Arret(RAISONS[r.etat] ?? RAISONS.inconnu);
    pages.modifier = r.releve;
    if (!r.ok) {
      await enregistrer(r.message);
      return { resultat: "erreur", message: `${r.message} Rien n'a été modifié.` };
    }
    await enregistrer();
    return { resultat: "essai" };
  }
  await enregistrer();
  onglet = await ouvrirOnglet(`${vinted}/items/new`);
  await verifierPage(onglet);
  await publier(onglet, api, { essai: true, article: action.annonce });
  return { resultat: "essai" };
}

/**
 * Lecture du « Porte-monnaie » (#148), en essai : la page est ouverte et relevée (« Dernier relevé ») pour
 * calibrer la lecture des commandes ; aucune commande n'est encore envoyée à l'application.
 */
async function lireCommandes(api, vinted) {
  await journal("Ventes finalisées : lecture du « Porte-monnaie » (essai)…");
  const onglet = await ouvrirOnglet(`${vinted}${SELECTEURS.pagePorteMonnaie}`);
  await verifierPage(onglet);
  const releve = await releverPage(onglet, "ventes");
  await chrome.storage.local.set({
    diagnostic: { ...releve, date: new Date().toISOString(), etape: "tâche : ventes finalisées", erreur: null },
  });
  await api.commandes({ essai: true, commandes: [] });
  await journal("Ventes finalisées : page relevée, rien n'est modifié. Fenêtre de l'extension → « Dernier relevé ».");
}

/** Action suivante des tâches automatiques : prise, faite (en essai), résultat renvoyé à l'application. */
async function faireActionSuivante(api, vinted, signaler) {
  const action = await api.actionSuivante();
  if (!action) return signaler("Aucune action prête (pause entre deux actions, ou hors des heures réglées).");
  await ecrireEtat({ actionEnCours: action.id });
  const reference = `#${String(action.reference).padStart(4, "0")}`;
  const libelle = LIBELLES_ACTION[action.type]?.(action) ?? action.type;
  await journal(`${reference} : ${libelle}${action.essai ? " (essai)" : ""}…`);
  let resultat;
  let arret = null;
  try {
    resultat = await executerAction(api, action, vinted);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    resultat = { resultat: "erreur", message };
    if (erreur instanceof Arret) arret = message;
  }
  await api.resultatAction(action.id, resultat);
  await ecrireEtat({ actionEnCours: null });
  await journal(
    resultat.resultat === "essai"
      ? `${reference} : essai, pages Vinted ouvertes et relevées, rien n'est modifié.`
      : `${reference} : erreur — ${resultat.message}`,
  );
  if (arret) await mettreEnPause(arret);
}

/**
 * Un passage. « manuel » (bouton « Vérifier maintenant ») : le journal dit toujours pourquoi rien ne se passe
 * (issue #61) ; les passages automatiques, toutes les 5 minutes, restent silencieux quand il n'y a rien à faire.
 */
async function cycleSansVerrou(manuel) {
  const { config, etat, vinted } = await lire();
  const signaler = async (texte) => {
    if (manuel) await journal(texte);
  };
  if (!config) return signaler("Non configurée : ouvrez les Réglages de l'extension.");
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
  // De même pour une action des tâches automatiques (#147).
  if (etat.actionEnCours) {
    await api.resultatAction(etat.actionEnCours, {
      resultat: "erreur",
      message: "Action interrompue (Chrome fermé ou extension rechargée). Vérifiez l'annonce sur Vinted.",
    });
    await ecrireEtat({ actionEnCours: null });
  }
  if (etat.pause) return signaler("En pause : cliquez « Reprendre » pour relancer.");

  // Signale aussi à l'application que l'extension est active (et lui fait prévoir les tâches automatiques).
  const { nombre, actions, lectureCommandes } = await api.attente();
  if (nombre === 0 && actions === 0 && !lectureCommandes)
    return signaler("Aucune annonce en attente : demandez « Publier sur Vinted » depuis l'application.");
  if (Date.now() < etat.prochain) {
    const heure = new Date(etat.prochain).toLocaleTimeString("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
    });
    return signaler(
      nombre > 0
        ? `${nombre} annonce(s) en attente : prochaine publication possible après ${heure}.`
        : `${actions} action(s) en attente : prochaine action possible après ${heure}.`,
    );
  }
  // La publication passe d'abord ; sans annonce à publier, la lecture des commandes (#148), puis une action des
  // tâches automatiques (#147). Une seule opération sur Vinted par passage.
  if (nombre === 0 && lectureCommandes) return lireCommandes(api, vinted);
  if (nombre === 0) return faireActionSuivante(api, vinted, signaler);

  // Vérifier la page AVANT de prendre une demande (sinon elle resterait « en cours »).
  const onglet = await ouvrirOnglet(`${vinted}/items/new`);
  const etatPage = await etatOnglet(onglet);
  if (etatPage !== "pret") throw new Arret(RAISONS[etatPage] ?? RAISONS.inconnu);

  const demande = await api.suivante();
  if (!demande) return signaler("Aucune annonce en attente.");
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
  // L'attente de 10 minutes ne suit qu'une vraie publication : après un essai ou une erreur, rien n'a été publié.
  await ecrireEtat({
    enCours: null,
    prochain: resultat.resultat === "publie" ? Date.now() + PAUSE_ENTRE_ARTICLES_MS : 0,
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

/**
 * Diagnostic (issue #56) : ouvre « Vendre un article », relève la structure du formulaire et l'enregistre pour la
 * page diagnostic.html (fichier à envoyer à Claude). Aucune demande n'est prise, rien n'est saisi ni envoyé.
 */
async function diagnostic() {
  if (occupe) return { ok: false, message: "Une publication est en cours : réessayez dans quelques minutes." };
  occupe = true;
  try {
    const { vinted } = await lire();
    const onglet = await ouvrirOnglet(`${vinted}/items/new`);
    await attendreMs(3000); // laisser le formulaire s'afficher
    const r = await envoyer(onglet, { type: "diagnostic", niveau: "Femmes" });
    if (!r?.ok) return { ok: false, message: r?.message ?? "La page Vinted ne répond pas (êtes-vous connecté ?)." };
    await chrome.storage.local.set({ diagnostic: r.diagnostic });
    await journal("Diagnostic enregistré.");
    await chrome.tabs.create({ url: chrome.runtime.getURL("diagnostic.html") });
    return { ok: true };
  } finally {
    occupe = false;
  }
}

/**
 * « Relever cet onglet » (#224) : relève la page Vinted ouverte telle quelle (boîte de dialogue comprise), sans rien
 * cliquer, pour calibrer ce que l'extension n'ouvre jamais seule (ex. confirmation de suppression d'une annonce).
 */
async function releverOnglet(ongletId) {
  const { vinted } = await lire();
  const onglet =
    ongletId === undefined
      ? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]
      : await chrome.tabs.get(ongletId);
  if (!onglet?.url?.startsWith(vinted))
    return { ok: false, message: "Ouvrez d'abord la page Vinted à relever, puis cliquez « Relever cet onglet »." };
  const r = await envoyer(onglet.id, { type: "releve-onglet" });
  if (!r?.ok) return { ok: false, message: "La page Vinted ne répond pas : rechargez-la, puis réessayez." };
  await chrome.storage.local.set({
    diagnostic: { ...r.releve, date: new Date().toISOString(), etape: "relevé de l'onglet", erreur: null },
  });
  await journal("Onglet relevé : fenêtre de l'extension → « Dernier relevé ».");
  await chrome.tabs.create({ url: chrome.runtime.getURL("diagnostic.html") });
  return { ok: true };
}

/** Un passage : appelé par l'alarme, par « Vérifier maintenant » (manuel) et par les tests. */
async function cycle(manuel = false) {
  if (occupe) {
    if (manuel) await journal("Une publication ou un diagnostic est déjà en cours : patientez.");
    return;
  }
  occupe = true;
  await majBadge(true);
  try {
    await cycleSansVerrou(manuel);
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

chrome.runtime.onInstalled.addListener((details) => {
  // Mise à jour de l'extension : l'attente héritée d'une erreur (ancienne version) est levée (#61).
  if (details.reason === "update") void ecrireEtat({ prochain: 0 });
  void preparerAlarme();
});
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
      void cycle(true);
      return { ok: true };
    case "diagnostic":
      return diagnostic();
    case "releverOnglet":
      return releverOnglet();
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
