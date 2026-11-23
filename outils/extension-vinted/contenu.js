// Script de contenu, chargé dans les pages Vinted de l'utilisateur. Il n'agit QUE sur demande du service worker :
//   « etat »    → bloque | verification | deconnecte | pret
//   « etape »   → une étape du remplissage de « Vendre un article » (photos, titre…), ou « controle » : relecture
//   « diagnostic » → relevé des éléments du formulaire, pour calibrer selecteurs.js (rien n'est saisi ni envoyé)
//   « ajouter » → clique « Ajouter » (publication réelle)
//   « releve-page » → relevé d'une page (annonce, « Modifier l'annonce ») pour la tâche « Articles dormants » (#147)
//   « lire-prix » → prix affiché dans le formulaire « Modifier l'annonce » (lecture seule, rien n'est saisi)
//   « baisser-prix » → mode réel (#147) : vérifie le prix, saisit le nouveau, clique « Valider » (seul bouton touché)
//   « supprimer-annonce » → mode réel (#147) : « Supprimer », puis « Supprimer » DANS la fenêtre de confirmation
// Aucun contournement : pas de camouflage, pas de captcha. Au moindre doute (champ introuvable, valeur différente,
// vérification), on s'arrête SANS cliquer « Ajouter ».
/* global SELECTEURS */

const DELAI_MS = 10_000;
const attendreMs = (ms) => new Promise((r) => setTimeout(r, ms));

class ErreurPublication extends Error {
  /** `elements` : relevé pris avant de refermer une liste (#239), sinon la page est relevée après l'erreur. */
  constructor(message, elements = null) {
    super(message);
    this.elements = elements;
  }
}

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
  // Relevé du 22/11/2026 (#149) : la page d'une conversation contient un cadre anti-robot caché, sans vérification
  // affichée ; seule une vérification visible met l'extension en pause.
  if (SELECTEURS.verification.some((s) => [...document.querySelectorAll(s)].some(visible))) return "verification";
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

/**
 * Saisie comme au clavier (#288) : texte sélectionné puis remplacé (« insertText », les événements qu'enverrait un
 * clavier), puis sortie du champ, qui fait valider la valeur par Vinted. Saisie directe si le navigateur refuse.
 */
function saisirAuClavier(el, valeur) {
  el.focus();
  el.select();
  if (!document.execCommand("insertText", false, valeur)) saisir(el, valeur);
  el.blur();
}

/** Message d'erreur affiché par Vinted sous le champ prix (#288), sinon null. */
function erreurPrix(el) {
  let bloc = el.parentElement;
  for (let i = 0; i < 4 && bloc; i++, bloc = bloc.parentElement) {
    const texte = [...bloc.querySelectorAll("span, p, div")]
      .filter((e) => e.children.length === 0 && visible(e))
      .map((e) => normaliser(e.textContent))
      .find((t) => SELECTEURS.textesErreurPrix.some((debut) => t.startsWith(debut)));
    if (texte) return texte;
  }
  return null;
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
    // Libellé d'une option : son titre s'il y en a un (une case « état » porte aussi une description), sinon son
    // texte. Égalité d'abord : « Bon état » ne doit pas choisir « Très bon état ».
    const libelle = (el) => normaliser(el.querySelector(SELECTEURS.titreResultat)?.textContent ?? el.textContent);
    // « Contient » seulement pour un texte d'au moins 3 lettres : une taille « S » ne doit pas choisir « XS »
    // (ni n'importe quelle option contenant un « s »).
    const trouvee =
      candidates.find((el) => libelle(el) === voulu) ??
      (voulu.length >= 3 ? candidates.find((el) => libelle(el).includes(voulu)) : undefined);
    if (trouvee) return trouvee;
    await attendreMs(250);
  } while (Date.now() < fin);
  return null;
}

/**
 * Valeur affichée d'un champ, normalisée : ce qui est saisi, ou le texte d'une liste de choix. Les nouvelles listes
 * de Vinted (#239) sont des boutons, dont la propriété `value` est vide : leur texte fait foi.
 */
const valeurDe = (el) =>
  normaliser(
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
      ? el.value
      : el.textContent,
  );

/** Libellés des options visibles (pour un message d'erreur utile). */
function optionsVisibles() {
  return [...document.querySelectorAll(SELECTEURS.options.join(", "))]
    .filter((el) => visible(el) && !el.closest(SELECTEURS.horsOptions))
    .map((el) => el.textContent?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 15);
}

/**
 * Ouvre une liste de choix. Nouvelles listes de Vinted (#239) : bouton portant `aria-expanded`. Si la liste n'est
 * pas ouverte après le clic complet (appui, relâchement, clic), un « click » seul est tenté, puis la touche Entrée.
 */
async function ouvrirListe(el) {
  cliquer(el);
  if (!el.hasAttribute("aria-expanded")) return;
  const ouverte = async () => {
    const fin = Date.now() + 1000;
    do {
      if (el.getAttribute("aria-expanded") === "true") return true;
      await attendreMs(100);
    } while (Date.now() < fin);
    return false;
  };
  if (await ouverte()) return;
  el.click();
  if (await ouverte()) return;
  el.focus();
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await ouverte();
}

const fermerListe = () =>
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

/**
 * Ouvre une liste de choix et clique l'option portant ce texte (recherche tapée si la liste en propose une).
 * Si Vinted a déjà rempli le champ avec cette valeur (suggestion automatique), on n'y touche pas.
 */
async function choisir(nom, texte, { fermer = false } = {}) {
  const el0 = await champ(nom);
  // Valeur déjà choisie (par Vinted ou un passage précédent) : égalité exacte, une valeur par virgule (couleurs).
  if (
    valeurDe(el0)
      .split(",")
      .map((v) => v.trim())
      .includes(normaliser(texte))
  )
    return;
  await ouvrirListe(el0);
  const recherche = await attendre(SELECTEURS.rechercheDansListe, 800);
  if (recherche && visible(recherche)) saisir(recherche, texte);
  const el = await option(texte);
  if (!el) {
    const proposes = optionsVisibles();
    const elements = releve(); // liste encore ouverte
    fermerListe();
    throw new ErreurPublication(
      `« ${texte} » introuvable dans la liste « ${nom} » de Vinted.` +
        (proposes.length > 0 ? ` Choix proposés : ${proposes.join(", ")}.` : ""),
      elements,
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
  await ouvrirListe(entree);
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
      /** @type {HTMLInputElement | null} */
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
  const elements = releve(); // liste encore ouverte
  fermerListe();
  throw new ErreurPublication(
    `Catégorie « ${finale} » introuvable sur Vinted (chemin : ${chemin.join(" › ")}).` +
      (proposes.length > 0 ? ` Choix proposés par Vinted : ${proposes.join(", ")}.` : "") +
      " Corrigez la catégorie de l'article, ou envoyez le Dernier relevé à Claude.",
    elements,
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
  /** @type {HTMLInputElement | null} */
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
    // Relevé du 14/10/2026 (#176) : Vinted reformate le prix (« 9.00 € ») et lit « 9,00 » comme « NaN € » : saisie
    // avec un point, puis relecture tout de suite (erreur et relevé à cette étape plutôt qu'au contrôle).
    // Capture du 21/11/2026 (#288) : le champ peut afficher le prix sans que Vinted l'ait pris en compte (« doit être
    // supérieur ou égal à 1.0 ») : saisie comme au clavier (texte sélectionné puis remplacé), sortie du champ, puis
    // relecture du champ et de son message d'erreur ; un second essai par la saisie directe si besoin.
    const valeur = article.prix.replace(",", ".");
    const relire = async () => {
      await attendreMs(500);
      return champ("prix");
    };
    let el = await champ("prix");
    saisirAuClavier(el, valeur);
    el = await relire();
    if (montant(el.value) !== montant(article.prix) || erreurPrix(el)) {
      saisir(el, "");
      await attendreMs(300);
      el = await relire();
      saisir(el, valeur);
      el.blur();
      el = await relire();
    }
    if (montant(el.value) !== montant(article.prix))
      throw new ErreurPublication(`Prix : Vinted affiche « ${el.value} » au lieu de « ${article.prix} ».`);
    const erreur = erreurPrix(el);
    if (erreur) throw new ErreurPublication(`Prix « ${el.value} » refusé par Vinted : « ${erreur} ».`);
  },
  async colis(article) {
    await choisirColis({ petit: "Petit", moyen: "Moyen", grand: "Grand" }[article.formatColis] ?? "Petit");
  },
};

/** Montant lu dans un texte (« 9,00 », « 9.00 € ») ; NaN si illisible. */
const montant = (t) =>
  Number(
    String(t ?? "")
      .replace(/[^\d,.-]/g, "")
      .replace(",", "."),
  );

/** Relit chaque champ dans la page. Renvoie la liste des écarts (vide = on peut publier). */
async function controler(article, nombrePhotos) {
  const ecarts = [];
  const attendu = async (nom, texte, mode = "egal") => {
    const el = await champ(nom, false);
    if (!el) return ecarts.push(`${nom} : champ introuvable`);
    const lu = valeurDe(el);
    const voulu = normaliser(texte);
    // « parties » : égalité avec l'une des parties du libellé (« W32 | FR 42 » pour « W32 », #290).
    const ok =
      mode === "egal"
        ? lu === voulu
        : mode === "parties"
          ? lu.split("|").some((partie) => partie.trim() === voulu)
          : lu.includes(voulu);
    if (!ok) ecarts.push(`${nom} : « ${lu} » au lieu de « ${voulu} »`);
  };
  await attendu("titre", article.titre);
  await attendu("description", article.description);
  // Prix : comparé en nombre (Vinted affiche « 9.00 € » pour « 9,00 »).
  const prix = await champ("prix", false);
  if (!prix) ecarts.push("prix : champ introuvable");
  else if (montant(prix.value) !== montant(article.prix))
    ecarts.push(`prix : « ${prix.value} » au lieu de « ${article.prix} »`);
  else if (erreurPrix(prix)) ecarts.push(`prix : refusé par Vinted (« ${erreurPrix(prix)} »)`);
  await attendu("categorie", categorieChoisie ?? article.categorie.at(-1) ?? "", "contient");
  await attendu("marque", article.marque, "contient");
  await attendu("etat", article.etat); // égalité : « Bon état » ≠ « Très bon état »
  // Taille : égalité (« S » ≠ « XS »), avec l'une des parties du libellé de Vinted (« W32 | FR 42 », #290).
  // Seulement si l'article en a une et si Vinted propose le champ.
  if (article.taille && (await champ("taille", false))) await attendu("taille", article.taille, "parties");
  for (const couleur of article.couleurs) await attendu("couleur", couleur, "contient");
  await attendre(SELECTEURS.photosDeposees, 5000);
  const nombre = SELECTEURS.photosDeposees.map((s) => document.querySelectorAll(s).length).find((n) => n > 0) ?? 0;
  if (nombre < nombrePhotos) ecarts.push(`photos : ${nombre} déposée(s) sur ${nombrePhotos}`);
  return ecarts;
}

function boutonAjouter(texte = SELECTEURS.texteBoutonAjouter) {
  return (
    trouver(SELECTEURS.boutonAjouter) ??
    [...document.querySelectorAll("button")].find((b) => normaliser(b.textContent) === normaliser(texte)) ??
    null
  );
}

/**
 * Baisse réelle (#147) sur « Modifier l'annonce » : le prix affiché doit être celui que l'application connaît (sinon
 * rien n'est touché), le nouveau prix est saisi puis relu, et seul « Valider » est cliqué (jamais « Pousser » ni les
 * photos). Le clic part après la réponse : la page change d'adresse.
 */
async function baisserPrix(avant, apres) {
  const el = await attendre(SELECTEURS.champs.prix);
  if (!el) throw new ErreurPublication("Prix introuvable sur « Modifier l'annonce ». Rien n'a été modifié.");
  if (montant(el.value) !== montant(avant))
    throw new ErreurPublication(
      `Prix sur Vinted « ${el.value} » différent de celui de l'application (${avant} €). Rien n'a été modifié.`,
    );
  // Saisie avec un point, comme à la publication (#176). Essai réel du 22/10/2026 : le prix déjà rempli, remplacé
  // d'un coup, est relu vide ; le champ est donc vidé d'abord, puis saisi, et relu (champ recherché à nouveau, au cas
  // où Vinted l'a redessiné). En dernier recours, saisie comme au clavier (texte sélectionné puis remplacé).
  const valeur = apres.replace(",", ".");
  const relire = async () => {
    await attendreMs(500);
    return (await attendre(SELECTEURS.champs.prix, 2000)) ?? el;
  };
  saisir(el, "");
  await attendreMs(300);
  let champPrix = await relire();
  saisir(champPrix, valeur);
  champPrix = await relire();
  if (montant(champPrix.value) !== montant(apres)) {
    champPrix.focus();
    champPrix.select();
    document.execCommand("insertText", false, valeur);
    champPrix = await relire();
  }
  if (montant(champPrix.value) !== montant(apres))
    throw new ErreurPublication(
      `Prix : Vinted affiche « ${champPrix.value} » au lieu de « ${apres} ». Rien n'a été validé.`,
    );
  const bouton = boutonAjouter(SELECTEURS.texteBoutonValider);
  if (!bouton) throw new ErreurPublication("Bouton « Valider » introuvable. Rien n'a été modifié.");
  setTimeout(() => cliquer(bouton), 100);
}

/**
 * Suppression réelle (#147) : « Supprimer » de l'annonce, puis le bouton de confirmation cherché DANS la fenêtre
 * (le bouton de la page, de même texte, reste dessous). Sans fenêtre ou sans confirmation : « Annuler », erreur.
 */
async function supprimerAnnonce() {
  const bouton = boutonAnnonce(SELECTEURS.annonce.supprimer, SELECTEURS.annonce.texteSupprimer);
  if (!bouton) throw new ErreurPublication("Bouton « Supprimer » introuvable sur l'annonce. Rien n'a été supprimé.");
  cliquer(bouton);
  const fenetre = await attendre(SELECTEURS.annonce.fenetreSuppression, 5000);
  const confirmer =
    fenetre &&
    (SELECTEURS.annonce.confirmerSuppression.map((s) => fenetre.querySelector(s)).find(Boolean) ??
      [...fenetre.querySelectorAll("button")].find(
        (b) => normaliser(b.textContent) === normaliser(SELECTEURS.annonce.texteSupprimer),
      ));
  if (!confirmer) {
    // Fenêtre ouverte mais confirmation non reconnue : seul le bouton « Annuler » connu est cliqué, sinon rien.
    const annuler = fenetre && SELECTEURS.annonce.annulerSuppression.map((s) => fenetre.querySelector(s)).find(Boolean);
    if (annuler) cliquer(annuler);
    throw new ErreurPublication("Fenêtre de confirmation de la suppression introuvable. Rien n'a été supprimé.");
  }
  setTimeout(() => cliquer(confirmer), 100);
}

/**
 * Description courte d'un élément pour le diagnostic (aucune valeur saisie n'est relevée). Relevé compact (#253) :
 * seuls les champs renseignés sont gardés, et `visible` seulement quand l'élément est caché (absent = visible).
 */
function decrire(el) {
  const texte = normaliser(el.textContent).slice(0, 80);
  const description = {
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
  return Object.fromEntries(
    Object.entries(description).filter(([cle, valeur]) => valeur !== null && !(cle === "visible" && valeur === true)),
  );
}

const ELEMENTS_UTILES =
  "input, textarea, select, button, label, [data-testid], [role], [aria-expanded], [aria-haspopup], li";

function releve() {
  return [...document.querySelectorAll(ELEMENTS_UTILES)].filter(visible).slice(0, 1200).map(decrire);
}

const DIALOGUES = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open]';

/** Boîtes de dialogue ouvertes (ex. confirmation de suppression, #224) : leur texte et tous leurs éléments. */
function dialogues() {
  return [...document.querySelectorAll(DIALOGUES)].filter(visible).map((d) => ({
    ...decrire(d),
    texteComplet: normaliser(d.textContent).slice(0, 300) || null,
    elements: [...d.querySelectorAll(ELEMENTS_UTILES)].map(decrire),
  }));
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

/** Relevé automatique de la page au moment d'une erreur (liste éventuellement ouverte) : calibrage de selecteurs.js. */
function releveErreur(etape, erreur, elements = null) {
  return {
    adresse: location.href,
    etat: etatPage(),
    date: new Date().toISOString(),
    etape,
    erreur,
    selecteursTrouves: selecteursTrouves(),
    elements: elements ?? releve(),
  };
}

/** Bouton d'une annonce (« Modifier », « Supprimer ») : repère connu, sinon texte du bouton ou du lien. */
function boutonAnnonce(repere, texte) {
  return (
    trouver(repere) ??
    [...document.querySelectorAll("button, a")].find(
      (b) => visible(b) && normaliser(b.textContent) === normaliser(texte),
    ) ??
    null
  );
}

/** Relevé d'une page de la tâche « Articles dormants » (#147) : rien n'est cliqué ni saisi. */
function relevePage(nom) {
  return {
    page: nom,
    adresse: location.href,
    etat: etatPage(),
    date: new Date().toISOString(),
    boutonsTrouves: {
      modifier: !!boutonAnnonce(SELECTEURS.annonce.modifier, SELECTEURS.annonce.texteModifier),
      supprimer: !!boutonAnnonce(SELECTEURS.annonce.supprimer, SELECTEURS.annonce.texteSupprimer),
    },
    selecteursTrouves: selecteursTrouves(),
    elements: releve(),
  };
}

/**
 * Annonce retrouvée sur le profil (#288) : après « Ajouter », Vinted n'ouvre pas toujours la page de l'annonce alors
 * qu'elle est publiée. Le numéro du membre vient de l'adresse ou d'un lien du profil ; les annonces les plus récentes
 * sont lues (même demande que la page du profil) et celle qui porte exactement ce titre est retenue.
 * @param {string} titre
 */
async function chercherAnnonce(titre) {
  const motif = new RegExp(SELECTEURS.motifProfil);
  const lien = [...document.querySelectorAll('a[href*="/member/"]')]
    .map((a) => motif.exec(new URL(a.getAttribute("href") ?? "", location.href).pathname)?.[1])
    .find(Boolean);
  const membre = motif.exec(location.pathname)?.[1] ?? lien;
  if (!membre) return { ok: false, message: "lien du profil introuvable sur la page" };
  let reponse;
  try {
    reponse = await fetch(SELECTEURS.annoncesDuProfil.replace("{id}", membre), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
  } catch {
    return { ok: false, message: "annonces du profil illisibles (réseau)" };
  }
  if (!reponse.ok) return { ok: false, message: `annonces du profil illisibles (erreur ${reponse.status})` };
  /** @type {{ items?: { id?: number; title?: string; url?: string; path?: string }[] } | null} */
  const donnees = await reponse.json().catch(() => null);
  const annonces = donnees?.items ?? [];
  const trouvee = annonces.find((a) => normaliser(a.title ?? "") === normaliser(titre));
  if (!trouvee?.id)
    return { ok: false, message: `aucune annonce « ${titre} » parmi les ${annonces.length} plus récentes du profil` };
  const url = new URL(trouvee.url ?? trouvee.path ?? `/items/${trouvee.id}`, location.origin).href;
  return { ok: true, url };
}

// --- Offres aux favoris (#149) ---

/** Empreinte SHA-256 (hexadécimal) d'un pseudo : le pseudo ne quitte jamais le PC (ADR-0100). */
async function empreinte(pseudo) {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normaliser(pseudo)));
  return [...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

const DUREES_MS = {
  seconde: 1000,
  minute: 60_000,
  heure: 3_600_000,
  jour: 86_400_000,
  semaine: 7 * 86_400_000,
  mois: 30 * 86_400_000,
  an: 365 * 86_400_000,
};

/** Date d'après « il y a 3 jours » (approximative) ; maintenant si le texte n'est pas reconnu. */
function dateDepuis(texte) {
  const m = /il y a (\d+|une?|quelques) (seconde|minute|heure|jour|semaine|mois|an)/.exec(normaliser(texte));
  if (!m) return new Date();
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : m[1] === "quelques" ? 0 : 1;
  return new Date(Date.now() - n * DUREES_MS[m[2]]);
}

/** Notifications de favori de la page : pseudo, titre, date, lien. */
async function notificationsFavoris() {
  const motif = new RegExp(SELECTEURS.favoris.motifFavori);
  const liste = [];
  for (const el of document.querySelectorAll(SELECTEURS.favoris.notification)) {
    const texte = String(el.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const m = motif.exec(texte);
    if (!m) continue;
    liste.push({
      pseudo: m[1].trim(),
      titre: m[2].trim(),
      depuis: dateDepuis(texte),
      url: el instanceof HTMLAnchorElement ? el.href : (el.querySelector("a")?.href ?? null),
      el,
    });
  }
  return liste;
}

/** Lien de « Voir tout » des notifications (menu de la cloche ouvert au besoin). */
async function lienNotifications() {
  let voirTout = trouver(SELECTEURS.favoris.voirTout);
  if (!voirTout) {
    const cloche = await attendre(SELECTEURS.favoris.cloche, 5000);
    if (!cloche) return { ok: false, message: "Cloche des notifications introuvable (à calibrer)." };
    cliquer(cloche);
    voirTout = await attendre(SELECTEURS.favoris.voirTout, 5000);
  }
  if (!voirTout) return { ok: false, message: "« Voir tout » des notifications introuvable (à calibrer)." };
  const url = voirTout instanceof HTMLAnchorElement ? voirTout.href : null;
  if (!url) {
    setTimeout(() => cliquer(voirTout), 100);
    return { ok: true, url: null };
  }
  return { ok: true, url };
}

/**
 * Toutes les notifications (#295) : la page en charge d'autres en bas ; on la fait défiler jusqu'à ce que leur nombre
 * ne change plus (500 au plus).
 */
async function chargerToutesNotifications() {
  await attendre([SELECTEURS.favoris.notification], 8000);
  let avant = -1;
  let stable = 0;
  for (let i = 0; i < 60 && stable < 2; i++) {
    const liste = document.querySelectorAll(SELECTEURS.favoris.notification);
    if (liste.length >= 500) break;
    stable = liste.length === avant ? stable + 1 : 0;
    avant = liste.length;
    liste[liste.length - 1]?.scrollIntoView({ block: "end" });
    window.scrollTo(0, document.documentElement.scrollHeight);
    await attendreMs(1000);
  }
}

/** Favoris lus sur la page des notifications : empreinte de la personne, titre, date (jamais le pseudo). */
async function lireFavoris() {
  await chargerToutesNotifications();
  const favoris = [];
  for (const n of await notificationsFavoris())
    favoris.push({ personne: await empreinte(n.pseudo), titre: n.titre, depuis: n.depuis.toISOString() });
  return { ok: true, favoris, releve: relevePage("notifications") };
}

/** Lien de la notification de cette personne pour cet article. */
async function lienFavori(personne, titre) {
  await chargerToutesNotifications();
  for (const n of await notificationsFavoris()) {
    if (normaliser(n.titre) !== normaliser(titre) || (await empreinte(n.pseudo)) !== personne) continue;
    if (n.url) return { ok: true, url: n.url };
    setTimeout(() => cliquer(n.el), 100);
    return { ok: true, url: null };
  }
  return { ok: false, message: `Notification du favori introuvable pour « ${titre} » (trop ancienne, ou déjà lue).` };
}

// --- Offres reçues (#150, ADR-0076) : extraction des offres via GET /api/v2/inbox + conversations. ---

/** Fetch API de Vinted depuis la page (aucune requête vers Vinted depuis l'extension, voir ADR-0068). */
async function apiVinted(chemin) {
  const reponse = await fetch(`/api/v2/${chemin}`, { credentials: "include", headers: { accept: "application/json" } });
  if (!reponse.ok) throw new ErreurPublication(`Requête Vinted refusée (HTTP ${reponse.status}) : ${chemin}`);
  return reponse.json().catch(() => ({}));
}

/** Numéro de l'annonce dans une URL Vinted (« /items/123-titre »), sinon null. */
function numeroAnnonceVinted(url) {
  return typeof url === "string" ? (/\/items\/(\d+)/.exec(url)?.[1] ?? null) : null;
}

/** Extraction tolérante d'une offre d'un message (formats courants de l'API Vinted). */
function extraireOffreRecue(message) {
  if (!message || typeof message !== "object") return null;
  const prix =
    message.prixOffre ?? message.offerPrice ?? message.offer?.price ?? message.prix ?? message.price ?? message.amount;
  if (typeof prix !== "number" || !Number.isFinite(prix) || prix <= 0) return null;
  const offreId =
    message.id ??
    message.messageId ??
    message.offerRequestId ??
    message.offer_request_id ??
    message.transactionId ??
    `${message.createdAt ?? Date.now()}`;
  return {
    offreId: String(offreId),
    articleId: numeroAnnonceVinted(message.articleUrl ?? message.article_url ?? message.url) ?? "",
    transactionId: typeof message.transactionId === "string" ? message.transactionId : null,
    offerRequestId: typeof message.offerRequestId === "string" ? message.offerRequestId : null,
    prixOffre: Math.round(prix * 100),
    depuis:
      typeof message.createdAt === "string" ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    message: typeof message.message === "string" ? message.message.slice(0, 500) : null,
  };
}

/** Offres reçues lues via GET /api/v2/inbox + GET /api/v2/conversations/{id} : envoyées à l'application. */
async function lireOffresRecues() {
  const inbox = await apiVinted("inbox");
  const conversations = Array.isArray(inbox?.conversations) ? inbox.conversations : Array.isArray(inbox) ? inbox : [];
  const offres = [];
  for (const conversation of conversations.slice(0, 20)) {
    const id = conversation?.id ?? conversation?.conversationId ?? conversation?.uid;
    if (typeof id !== "string") continue;
    try {
      const detail = await apiVinted(`conversations/${encodeURIComponent(id)}`);
      for (const message of Array.isArray(detail?.messages) ? detail.messages : []) {
        const offre = extraireOffreRecue(message);
        if (offre) offres.push(offre);
      }
    } catch {
      /* conversation lue, rien à en extraire */
    }
  }
  return offres;
}

/** Accepte l'offre reçue (PUT /api/v2/offer_requests/{id}/accept). */
async function accepterOffreRecue(offre) {
  const r = await fetch(`/api/v2/offer_requests/${encodeURIComponent(offre.offerRequestId)}/accept`, {
    method: "PUT",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  if (!r.ok) throw new ErreurPublication(`Acceptation refusée : HTTP ${r.status}`);
  await r.json().catch(() => ({}));
}

/** Envoie la contre-offre (POST /api/v2/transactions/{tid}/offers). */
async function contreOffreRecue(offre) {
  const r = await fetch(`/api/v2/transactions/${encodeURIComponent(offre.transactionId)}/offers`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ offer: { price: offre.prixContreOffre / 100, currency: "EUR" } }),
  });
  if (!r.ok) throw new ErreurPublication(`Contre-offre refusée : HTTP ${r.status}`);
  await r.json().catch(() => ({}));
}

/**
 * Offre dans la fenêtre « Faire une offre » de la conversation (ouverte par la notification, sinon par le bouton).
 * Essai : le prix est saisi et relu, puis la fenêtre est fermée sans rien envoyer.
 */
async function faireOffre(prix, titre, essai) {
  let fenetre = await attendre(SELECTEURS.favoris.fenetreOffre, 8000);
  if (!fenetre) {
    const bouton = boutonAnnonce(SELECTEURS.favoris.boutonFaireOffre, SELECTEURS.favoris.texteFaireOffre);
    if (bouton) {
      cliquer(bouton);
      fenetre = await attendre(SELECTEURS.favoris.fenetreOffre, 5000);
    }
  }
  if (!fenetre) throw new ErreurPublication("Fenêtre « Faire une offre » introuvable. Rien n'a été envoyé.");
  if (!normaliser(fenetre.textContent).includes(normaliser(titre)))
    throw new ErreurPublication(`La fenêtre d'offre ne concerne pas « ${titre} ». Rien n'a été envoyé.`);
  // Offre déjà faite dans la conversation (#295), par l'acheteur ou par vous : si elle est au même prix ou moins
  // chère, rien n'est envoyé.
  const existantes = [...document.querySelectorAll(SELECTEURS.favoris.offreExistante)]
    .filter((el) => !fenetre.contains(el))
    .map((el) => montant(el.textContent ?? ""))
    .filter((m) => Number.isFinite(m) && m > 0);
  if (existantes.length > 0 && Math.min(...existantes) <= montant(prix)) {
    const fermer = SELECTEURS.favoris.fermerOffre.map((s) => fenetre.querySelector(s)).find(Boolean);
    if (fermer) cliquer(fermer);
    const deja = Math.min(...existantes)
      .toFixed(2)
      .replace(".", ",");
    return {
      releve: null,
      inutile: `Offre déjà faite dans la conversation à ${deja} € (≤ ${prix} €) : rien n'est envoyé.`,
    };
  }
  const champPrix = SELECTEURS.favoris.prixOffre.map((s) => fenetre.querySelector(s)).find(Boolean);
  if (!(champPrix instanceof HTMLInputElement))
    throw new ErreurPublication("Champ du prix de l'offre introuvable. Rien n'a été envoyé.");
  saisirAuClavier(champPrix, prix.replace(",", "."));
  await attendreMs(500);
  if (montant(champPrix.value) !== montant(prix)) {
    saisir(champPrix, prix.replace(",", "."));
    await attendreMs(500);
  }
  if (montant(champPrix.value) !== montant(prix))
    throw new ErreurPublication(
      `Prix de l'offre : Vinted affiche « ${champPrix.value} » au lieu de « ${prix} ». Rien n'a été envoyé.`,
    );
  if (essai) {
    const releve = { ...relevePage("offre"), dialogues: dialogues() };
    const fermer = SELECTEURS.favoris.fermerOffre.map((s) => fenetre.querySelector(s)).find(Boolean);
    if (fermer) cliquer(fermer);
    return { releve };
  }
  const envoyer = SELECTEURS.favoris.envoyerOffre.map((s) => fenetre.querySelector(s)).find(Boolean);
  if (!envoyer)
    throw new ErreurPublication("Bouton « Faire une offre » de la fenêtre introuvable. Rien n'a été envoyé.");
  cliquer(envoyer);
  const fin = Date.now() + 10_000;
  while (Date.now() < fin) {
    await attendreMs(500);
    if (!fenetre.isConnected || !visible(fenetre)) return { releve: null };
  }
  throw new ErreurPublication(
    `Offre peut-être pas envoyée : la fenêtre est restée ouverte (« ${normaliser(fenetre.textContent).slice(0, 120)} »). Vérifiez la conversation sur Vinted.`,
  );
}

/** @param {MessageContenu} message */
async function traiter(message) {
  // Vinted Go (#309) : relevé de l'onglet seulement, jamais de remplissage ni de clic.
  if (globalThis.vhReleveSeul && message.type !== "releve-onglet")
    return { ok: false, message: "Sur Vinted Go, l'extension ne fait que relever la page." };
  if (message.type === "etat") return { etat: etatPage() };

  // « Relever cet onglet » (#224) : la page telle quelle, quel que soit son état, sans rien cliquer.
  if (message.type === "releve-onglet")
    return { ok: true, releve: { ...relevePage("onglet"), dialogues: dialogues() } };

  if (message.type === "releve-page") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    return { ok: true, releve: relevePage(message.nom) };
  }

  if (message.type === "lire-prix") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    const el = await attendre(SELECTEURS.champs.prix);
    const releve = relevePage("modifier");
    if (!el) return { ok: false, message: "Prix introuvable sur « Modifier l'annonce » (à calibrer).", releve };
    return { ok: true, prix: montant(el.value), releve };
  }

  if (message.type === "baisser-prix" || message.type === "supprimer-annonce") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    try {
      if (message.type === "baisser-prix") await baisserPrix(message.avant, message.apres);
      else await supprimerAnnonce();
      return { ok: true };
    } catch (erreur) {
      const apres = etatPage();
      if (apres !== "pret") return { ok: false, etat: apres };
      const texte = erreur instanceof Error ? erreur.message : String(erreur);
      return { ok: false, message: texte, releve: { ...releveErreur(message.type, texte), dialogues: dialogues() } };
    }
  }

  if (message.type === "etape") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    try {
      if (message.nom === "controle") {
        const ecarts = await controler(message.article, message.nombrePhotos);
        if (ecarts.length > 0) {
          const texte = `Contrôle avant envoi : ${ecarts.join(" ; ")}. Rien n'a été publié.`;
          return { ok: false, message: texte, releve: releveErreur(message.nom, texte) };
        }
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
      return { ok: false, message: texte, releve: releveErreur(message.nom, texte, erreur?.elements) };
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

  if (message.type === "chercher-annonce") return chercherAnnonce(message.titre);

  // Offres aux favoris (#149).
  if (message.type === "lien-notifications" || message.type === "lire-favoris" || message.type === "lien-favori") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    if (message.type === "lien-notifications") return lienNotifications();
    if (message.type === "lire-favoris") return lireFavoris();
    return lienFavori(message.personne, message.titre);
  }
  // Offres reçues (#150, ADR-0076).
  if (message.type === "lire-offres-recues") {
    try {
      return { ok: true, offres: await lireOffresRecues() };
    } catch (erreur) {
      const texte = erreur instanceof Error ? erreur.message : String(erreur);
      return { ok: false, message: `Lecture des offres reçues impossible : ${texte}` };
    }
  }
  if (message.type === "executer-offre-recue") {
    try {
      if (message.offre.prixContreOffre !== null) await contreOffreRecue(message.offre);
      else if (message.offre.offerRequestId) await accepterOffreRecue(message.offre);
      else throw new ErreurPublication("Identifiants de l'offre manquants : contactez l'aide du projet (#302).");
      return { ok: true, resultat: "faite" };
    } catch (erreur) {
      const texte = erreur instanceof Error ? erreur.message : String(erreur);
      return { ok: false, message: texte };
    }
  }

  if (message.type === "faire-offre") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    try {
      const { releve, inutile } = await faireOffre(message.prix, message.titre, message.essai);
      return { ok: true, releve, inutile };
    } catch (erreur) {
      const apres = etatPage();
      if (apres !== "pret") return { ok: false, etat: apres };
      const texte = erreur instanceof Error ? erreur.message : String(erreur);
      return { ok: false, message: texte, releve: { ...releveErreur("offre", texte), dialogues: dialogues() } };
    }
  }

  // Message imprévu (autre version de l'extension) : refusé.
  return { ok: false, message: `Demande inconnue : ${/** @type {{ type: string }} */ (message).type}` };
}

chrome.runtime.onMessage.addListener((message, _expediteur, repondre) => {
  traiter(message).then(repondre, (erreur) =>
    repondre({ ok: false, message: erreur instanceof Error ? erreur.message : String(erreur) }),
  );
  return true; // réponse asynchrone
});
