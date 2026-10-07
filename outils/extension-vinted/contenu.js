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
    const candidates = [...document.querySelectorAll(SELECTEURS.options.join(", "))].filter(
      (el) => visible(el) && !el.closest(SELECTEURS.horsOptions),
    );
    const trouvee =
      candidates.find((el) => normaliser(el.textContent) === voulu) ??
      candidates.find((el) => normaliser(el.textContent).includes(voulu));
    if (trouvee) return trouvee;
    await attendreMs(250);
  } while (Date.now() < fin);
  return null;
}

/** Valeur affichée d'un champ (saisie ou liste de choix), normalisée. */
const valeurDe = (el) => normaliser("value" in el && typeof el.value === "string" ? el.value : el.textContent);

/** Libellés des options visibles (pour un message d'erreur utile). */
function optionsVisibles() {
  return [...document.querySelectorAll(SELECTEURS.options.join(", "))]
    .filter((el) => visible(el) && !el.closest(SELECTEURS.horsOptions))
    .map((el) => el.textContent?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 15);
}

const fermerListe = () =>
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

/**
 * Ouvre une liste de choix et clique l'option portant ce texte (recherche tapée si la liste en propose une).
 * Si Vinted a déjà rempli le champ avec cette valeur (suggestion automatique), on n'y touche pas.
 */
async function choisir(nom, texte, { fermer = false } = {}) {
  const el0 = await champ(nom);
  if (valeurDe(el0).includes(normaliser(texte))) return;
  cliquer(el0);
  const recherche = await attendre(SELECTEURS.rechercheDansListe, 800);
  if (recherche && visible(recherche)) saisir(recherche, texte);
  const el = await option(texte);
  if (!el) {
    const proposes = optionsVisibles();
    fermerListe();
    throw new ErreurPublication(
      `« ${texte} » introuvable dans la liste « ${nom} » de Vinted.` +
        (proposes.length > 0 ? ` Choix proposés : ${proposes.join(", ")}.` : ""),
    );
  }
  cliquer(el);
  if (fermer) fermerListe();
}

function fichier({ nom, type, base64 }) {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new File([octets], nom, { type });
}

/**
 * Catégorie (Femmes › Vêtements › Manteaux et vestes › …).
 * - Déjà remplie par Vinted avec la bonne catégorie (suggestion automatique) : rien n'est touché.
 * - Sinon, on descend l'arbre niveau par niveau. Si un niveau n'existe pas (l'arbre de Vinted diffère de celui de
 *   l'application, ou la liste s'ouvre déjà sur une sous-catégorie), on tape la catégorie finale dans la recherche
 *   de la liste et on la choisit parmi les résultats.
 */
/** Catégorie retenue sur Vinted (son nom peut différer de celui de l'application) : relue par le contrôle. */
let categorieChoisie = null;

/**
 * Meilleur résultat de la recherche de catégorie : même premier niveau que l'article (Femmes, Hommes…), puis nom
 * identique, ou nom par lequel commence celui de l'application (« Doudounes » pour « Doudounes et vestes
 * matelassées »), puis le plus de niveaux du chemin en commun. Null si rien ne convient.
 */
function meilleurResultat(chemin) {
  const finale = normaliser(chemin.at(-1));
  const niveaux = chemin.slice(0, -1).map(normaliser);
  let meilleur = null;
  for (const el of document.querySelectorAll(SELECTEURS.resultatsCategorie.join(", "))) {
    if (!visible(el)) continue;
    const nom = normaliser(el.querySelector(SELECTEURS.titreResultat)?.textContent ?? el.textContent);
    const parcours = normaliser(el.querySelector(SELECTEURS.cheminResultat)?.textContent)
      .split(">")
      .map((n) => n.trim())
      .filter(Boolean);
    if (niveaux.length > 0 && parcours.length > 0 && parcours[0] !== niveaux[0]) continue;
    const score =
      (nom === finale ? 100 : finale.startsWith(`${nom} `) ? 50 : finale.includes(nom) ? 30 : 0) +
      parcours.filter((n) => niveaux.includes(n)).length;
    if (score >= 30 && (!meilleur || score > meilleur.score)) meilleur = { el, nom, score };
  }
  return meilleur;
}

/**
 * Catégorie : on l'ouvre, on tape la catégorie finale dans « Trouver une catégorie » et on retient le meilleur
 * résultat. S'il est déjà coché (Vinted l'a choisi de lui-même), on n'y touche pas. Sans recherche ni résultat,
 * on descend l'arbre niveau par niveau. Le genre (Femmes / Hommes…) est toujours vérifié : Vinted peut suggérer
 * la bonne catégorie dans le mauvais rayon.
 */
async function choisirCategorie(chemin) {
  const entree = await champ("categorie");
  const finale = chemin.at(-1) ?? "";
  categorieChoisie = null;
  cliquer(entree);
  const recherche = await attendre(SELECTEURS.rechercheCategorie, 3000);
  if (recherche) {
    saisir(recherche, finale);
    const fin = Date.now() + 6000;
    let trouve = null;
    while (!trouve && Date.now() < fin) {
      await attendreMs(500);
      trouve = meilleurResultat(chemin);
    }
    if (trouve) {
      const radio = trouve.el.querySelector('input[type="radio"]');
      if (radio?.checked) fermerListe();
      else cliquer(trouve.el);
      await attendreMs(500);
      if (valeurDe(entree).includes(trouve.nom)) {
        categorieChoisie = trouve.nom;
        return;
      }
    }
    saisir(recherche, ""); // retour à l'arbre
    await attendreMs(500);
  }
  for (const [i, niveau] of chemin.entries()) {
    const el = await option(niveau, i === 0 ? DELAI_MS : 3000);
    if (!el) break;
    cliquer(el);
    await attendreMs(500);
    if (i === chemin.length - 1) {
      categorieChoisie = normaliser(niveau);
      return;
    }
  }
  const proposes = optionsVisibles();
  fermerListe();
  throw new ErreurPublication(
    `Catégorie « ${finale} » introuvable sur Vinted (chemin : ${chemin.join(" › ")}).` +
      (proposes.length > 0 ? ` Choix proposés par Vinted : ${proposes.join(", ")}.` : "") +
      " Corrigez la catégorie de l'article, ou envoyez le Dernier relevé à Claude.",
  );
}

/** Format du colis : case « Petit / Moyen / Grand » (titre éventuellement précédé de « Recommandé »). */
async function choisirColis(libelle) {
  if (!(await attendre(SELECTEURS.champs.colis, 1500))) return; // pas de choix proposé : rien à faire
  const voulu = normaliser(libelle);
  const cases = [...document.querySelectorAll(SELECTEURS.champs.colis.join(", "))];
  const caseColis = cases.find((c) => {
    const titre = normaliser(c.querySelector(SELECTEURS.titreColis)?.textContent);
    return titre === voulu || titre.endsWith(voulu);
  });
  if (!caseColis) throw new ErreurPublication(`Format de colis « ${libelle} » introuvable sur Vinted.`);
  const radio = caseColis.querySelector('input[type="radio"]');
  if (radio?.checked) return;
  cliquer(radio ?? caseColis);
  await attendreMs(500);
  if (radio && !radio.checked) throw new ErreurPublication(`Format de colis « ${libelle} » : la case ne se coche pas.`);
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
    await choisirCategorie(article.categorie);
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
    // Une couleur déjà choisie (par Vinted ou un passage précédent) n'est pas recliquée : ce serait la décocher.
    for (const couleur of article.couleurs) await choisir("couleur", couleur, { fermer: true });
  },
  async prix(article) {
    saisir(await champ("prix"), article.prix);
  },
  async colis(article) {
    await choisirColis({ petit: "Petit", moyen: "Moyen", grand: "Grand" }[article.formatColis] ?? "Petit");
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
  await attendu("categorie", categorieChoisie ?? article.categorie.at(-1) ?? "", "contient");
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
    // Valeur des champs (sauf fichiers) : pour voir ce que Vinted a déjà rempli de lui-même.
    valeur:
      el instanceof HTMLInputElement && el.type !== "file" && el.type !== "password"
        ? el.value.slice(0, 80) || null
        : null,
    coche: el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox") ? el.checked : null,
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

function selecteursTrouves() {
  return Object.fromEntries(
    Object.entries(SELECTEURS.champs).map(([nom, liste]) => [
      nom,
      liste.find((s) => document.querySelector(s)) ?? null,
    ]),
  );
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
    selecteursTrouves: selecteursTrouves(),
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
      const texte = erreur instanceof Error ? erreur.message : String(erreur);
      // Relevé automatique de la page au moment de l'erreur (liste éventuellement ouverte) : calibrage de selecteurs.js.
      const releveErreur = {
        adresse: location.href,
        etat: apres,
        date: new Date().toISOString(),
        etape: message.nom,
        erreur: texte,
        selecteursTrouves: selecteursTrouves(),
        elements: releve(),
      };
      return { ok: false, message: texte, releve: releveErreur };
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
