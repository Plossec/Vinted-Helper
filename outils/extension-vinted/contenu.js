// Script de contenu, chargé dans les pages Vinted de l'utilisateur. Il n'agit QUE sur demande du service worker :
//   « etat »    → bloque | verification | deconnecte | pret
//   « etape »   → une étape du remplissage de « Vendre un article » (photos, titre…), ou « controle » : relecture
//   « diagnostic » → relevé des éléments du formulaire, pour calibrer selecteurs.js (rien n'est saisi ni envoyé)
//   « ajouter » → clique « Ajouter » (publication réelle)
// Aucun contournement : pas de camouflage, pas de captcha. Au moindre doute (champ introuvable, valeur différente,
// vérification), on s'arrête SANS cliquer « Ajouter ».
/* global SELECTEURS */

const DELAI_MS = 10_000;
const attendreMs = (ms) => new Promise((r) => setTimeout(r, ms));

class ErreurPublication extends Error {}

const normaliser = (t) =>
  String(t ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const visible = (el) => el.getClientRects().length > 0;

function trouver(selecteurs) {
  for (const s of selecteurs) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

/** Premier élément présent parmi plusieurs sélecteurs possibles, ou null après le délai. */
async function attendre(selecteurs, delai = DELAI_MS) {
  const fin = Date.now() + delai;
  do {
    const el = trouver(selecteurs);
    if (el) return el;
    await attendreMs(250);
  } while (Date.now() < fin);
  return null;
}

function etatPage() {
  const texte = normaliser(document.body?.innerText);
  if (SELECTEURS.textesBlocage.some((t) => texte.includes(t))) return "bloque";
  if (trouver(SELECTEURS.verification)) return "verification";
  if (trouver(SELECTEURS.nonConnecte)) return "deconnecte";
  return "pret";
}

async function champ(nom, obligatoire = true) {
  const el = await attendre(SELECTEURS.champs[nom], obligatoire ? DELAI_MS : 1500);
  if (!el && obligatoire) throw new ErreurPublication(`Champ « ${nom} » introuvable sur la page Vinted (à calibrer).`);
  return el;
}

/** Saisie d'un texte comme au clavier : valeur posée par le « setter » natif, puis événements input / change. */
function saisir(el, valeur) {
  el.focus();
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(el, valeur);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function cliquer(el) {
  el.scrollIntoView({ block: "center" });
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"])
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  el.click();
}

/** Option visible portant ce texte (égalité d'abord, sinon texte contenu). */
async function option(texte, delai = DELAI_MS) {
  const voulu = normaliser(texte);
  const fin = Date.now() + delai;
  do {
    const candidates = [...document.querySelectorAll(SELECTEURS.options.join(", "))].filter(visible);
    const trouvee =
      candidates.find((el) => normaliser(el.textContent) === voulu) ??
      candidates.find((el) => normaliser(el.textContent).includes(voulu));
    if (trouvee) return trouvee;
    await attendreMs(250);
  } while (Date.now() < fin);
  return null;
}

/** Ouvre une liste de choix et clique l'option portant ce texte (recherche tapée si la liste en propose une). */
async function choisir(nom, texte, { fermer = false } = {}) {
  cliquer(await champ(nom));
  const recherche = await attendre(SELECTEURS.rechercheDansListe, 800);
  if (recherche && visible(recherche)) saisir(recherche, texte);
  const el = await option(texte);
  if (!el) throw new ErreurPublication(`« ${texte} » introuvable dans la liste « ${nom} » de Vinted.`);
  cliquer(el);
  if (fermer) document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

function fichier({ nom, type, base64 }) {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new File([octets], nom, { type });
}

/** Liste de choix à plusieurs niveaux (catégorie : Femmes › Vêtements › Manteaux et vestes › …). */
async function choisirChemin(nom, chemin) {
  cliquer(await champ(nom));
  for (const niveau of chemin) {
    const el = await option(niveau);
    if (!el)
      throw new ErreurPublication(
        `Catégorie « ${niveau} » introuvable sur Vinted (chemin : ${chemin.join(" › ")}). ` +
          "La liste ne s'est peut-être pas ouverte : lancez le Diagnostic de l'extension.",
      );
    cliquer(el);
    await attendreMs(500);
  }
}

/**
 * Étapes du remplissage, dans l'ordre. Le service worker les demande une à une, avec une pause entre chacune
 * (issue #57) et une vérification de la page avant chacune.
 */
const ETAPES = {
  async photos(article, photos) {
    const entree = await champ("photos");
    const transfert = new DataTransfer();
    for (const p of photos) transfert.items.add(fichier(p));
    entree.files = transfert.files;
    entree.dispatchEvent(new Event("input", { bubbles: true }));
    entree.dispatchEvent(new Event("change", { bubbles: true }));
  },
  async titre(article) {
    saisir(await champ("titre"), article.titre);
  },
  async description(article) {
    saisir(await champ("description"), article.description);
  },
  async categorie(article) {
    await choisirChemin("categorie", article.categorie);
  },
  async marque(article) {
    await choisir("marque", article.marque);
  },
  async taille(article) {
    // Certaines catégories n'ont pas de taille : champ facultatif.
    if (article.taille && (await champ("taille", false))) await choisir("taille", article.taille);
  },
  async etat(article) {
    await choisir("etat", article.etat);
  },
  async couleurs(article) {
    for (const couleur of article.couleurs) await choisir("couleur", couleur, { fermer: true });
  },
  async prix(article) {
    saisir(await champ("prix"), article.prix);
  },
  async colis(article) {
    if (await champ("colis", false)) {
      const libelle = { petit: "Petit", moyen: "Moyen", grand: "Grand" }[article.formatColis] ?? "Petit";
      await choisir("colis", libelle);
    }
  },
};

/** Relit chaque champ dans la page. Renvoie la liste des écarts (vide = on peut publier). */
async function controler(article, nombrePhotos) {
  const ecarts = [];
  const attendu = async (nom, texte, mode = "egal") => {
    const el = await champ(nom, false);
    if (!el) return ecarts.push(`${nom} : champ introuvable`);
    const lu = normaliser("value" in el && typeof el.value === "string" ? el.value : el.textContent);
    const voulu = normaliser(texte);
    if (!(mode === "egal" ? lu === voulu : lu.includes(voulu)))
      ecarts.push(`${nom} : « ${lu} » au lieu de « ${voulu} »`);
  };
  await attendu("titre", article.titre);
  await attendu("description", article.description);
  await attendu("prix", article.prix, "contient");
  await attendu("categorie", article.categorie.at(-1) ?? "", "contient");
  await attendu("marque", article.marque, "contient");
  await attendu("etat", article.etat, "contient");
  for (const couleur of article.couleurs) await attendu("couleur", couleur, "contient");
  await attendre(SELECTEURS.photosDeposees, 3000);
  const nombre = document.querySelectorAll(SELECTEURS.photosDeposees.join(", ")).length;
  if (nombre < nombrePhotos) ecarts.push(`photos : ${nombre} déposée(s) sur ${nombrePhotos}`);
  return ecarts;
}

function boutonAjouter() {
  return (
    trouver(SELECTEURS.boutonAjouter) ??
    [...document.querySelectorAll("button")].find(
      (b) => normaliser(b.textContent) === normaliser(SELECTEURS.texteBoutonAjouter),
    ) ??
    null
  );
}

/** Description courte d'un élément pour le diagnostic (aucune valeur saisie n'est relevée). */
function decrire(el) {
  const texte = normaliser(el.textContent).slice(0, 80);
  return {
    balise: el.tagName.toLowerCase(),
    type: el.getAttribute("type"),
    name: el.getAttribute("name"),
    id: el.id || null,
    testid: el.getAttribute("data-testid"),
    role: el.getAttribute("role"),
    aria: el.getAttribute("aria-label"),
    ariaExpanded: el.getAttribute("aria-expanded"),
    placeholder: el.getAttribute("placeholder"),
    classe: (el.getAttribute("class") ?? "").slice(0, 120) || null,
    texte: texte || null,
    visible: visible(el),
  };
}

const ELEMENTS_UTILES =
  "input, textarea, select, button, label, [data-testid], [role], [aria-expanded], [aria-haspopup], li";

function releve() {
  return [...document.querySelectorAll(ELEMENTS_UTILES)].filter(visible).slice(0, 1200).map(decrire);
}

/** Ancêtres d'un élément (pour situer une option de liste dans la page). */
function ancetres(el, niveaux = 8) {
  const liste = [];
  for (let e = el; e && e !== document.body && liste.length < niveaux; e = e.parentElement) liste.push(decrire(e));
  return liste;
}

/**
 * Diagnostic (issue #56) : relève les éléments du formulaire, puis ouvre la liste des catégories (simple clic, rien
 * n'est choisi ni envoyé) et relève ce qui est apparu, avec les ancêtres des options attendues.
 */
async function diagnostic(niveau) {
  const avant = releve();
  const champCategorie = await attendre(SELECTEURS.champs.categorie, 3000);
  let apres = [];
  let options = [];
  if (champCategorie) {
    cliquer(champCategorie);
    await attendreMs(2000);
    const connus = new Set(avant.map((e) => JSON.stringify(e)));
    apres = releve().filter((e) => !connus.has(JSON.stringify(e)));
    const voulu = normaliser(niveau);
    options = [...document.querySelectorAll("body *")]
      .filter((el) => visible(el) && normaliser(el.textContent) === voulu && el.children.length <= 3)
      .slice(0, 10)
      .map((el) => ancetres(el));
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  }
  return {
    adresse: location.href,
    etat: etatPage(),
    date: new Date().toISOString(),
    champCategorieTrouve: !!champCategorie,
    selecteursTrouves: Object.fromEntries(
      Object.entries(SELECTEURS.champs).map(([nom, liste]) => [
        nom,
        liste.find((s) => document.querySelector(s)) ?? null,
      ]),
    ),
    elements: avant,
    apparusApresClicCategorie: apres,
    [`options « ${niveau} »`]: options,
  };
}

async function traiter(message) {
  if (message.type === "etat") return { etat: etatPage() };

  if (message.type === "etape") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    try {
      if (message.nom === "controle") {
        const ecarts = await controler(message.article, message.nombrePhotos);
        if (ecarts.length > 0)
          return { ok: false, message: `Contrôle avant envoi : ${ecarts.join(" ; ")}. Rien n'a été publié.` };
        if (!boutonAjouter())
          return { ok: false, message: "Bouton « Ajouter » introuvable (à calibrer). Rien n'a été publié." };
        return { ok: true };
      }
      const etape = ETAPES[message.nom];
      if (!etape) return { ok: false, message: `Étape inconnue : ${message.nom}` };
      await etape(message.article, message.photos ?? []);
      return { ok: true };
    } catch (erreur) {
      // Une vérification apparue en cours de route prime sur l'erreur de champ.
      const apres = etatPage();
      if (apres !== "pret") return { ok: false, etat: apres };
      return { ok: false, message: erreur instanceof Error ? erreur.message : String(erreur) };
    }
  }

  if (message.type === "diagnostic") return { ok: true, diagnostic: await diagnostic(message.niveau ?? "Femmes") };

  if (message.type === "ajouter") {
    const bouton = boutonAjouter();
    if (!bouton) return { ok: false, message: "Bouton « Ajouter » introuvable." };
    // Clic après la réponse : la page va changer d'adresse.
    setTimeout(() => cliquer(bouton), 100);
    return { ok: true };
  }

  return { ok: false, message: `Demande inconnue : ${message.type}` };
}

chrome.runtime.onMessage.addListener((message, _expediteur, repondre) => {
  traiter(message).then(repondre, (erreur) =>
    repondre({ ok: false, message: erreur instanceof Error ? erreur.message : String(erreur) }),
  );
  return true; // réponse asynchrone
});
