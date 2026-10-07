// Script de contenu, chargé dans les pages Vinted de l'utilisateur. Il n'agit QUE sur demande du service worker :
//   « etat »    → bloque | verification | deconnecte | pret
//   « remplir » → remplit le formulaire « Vendre un article » puis relit chaque champ (rien n'est envoyé)
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

async function remplir(article, photos) {
  const entree = await champ("photos");
  const transfert = new DataTransfer();
  for (const p of photos) transfert.items.add(fichier(p));
  entree.files = transfert.files;
  entree.dispatchEvent(new Event("input", { bubbles: true }));
  entree.dispatchEvent(new Event("change", { bubbles: true }));

  saisir(await champ("titre"), article.titre);
  saisir(await champ("description"), article.description);

  // Catégorie : on descend l'arbre niveau par niveau (Hommes › Vêtements › Jeans › Jeans droits).
  cliquer(await champ("categorie"));
  for (const niveau of article.categorie) {
    const el = await option(niveau);
    if (!el)
      throw new ErreurPublication(
        `Catégorie « ${niveau} » introuvable sur Vinted (chemin : ${article.categorie.join(" › ")}).`,
      );
    cliquer(el);
    await attendreMs(300);
  }

  await choisir("marque", article.marque);
  // Certaines catégories n'ont pas de taille : champ facultatif.
  if (article.taille && (await champ("taille", false))) await choisir("taille", article.taille);
  await choisir("etat", article.etat);
  for (const couleur of article.couleurs) await choisir("couleur", couleur, { fermer: true });
  saisir(await champ("prix"), article.prix);
  if (await champ("colis", false)) {
    const libelle = { petit: "Petit", moyen: "Moyen", grand: "Grand" }[article.formatColis] ?? "Petit";
    await choisir("colis", libelle);
  }
}

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

async function traiter(message) {
  if (message.type === "etat") return { etat: etatPage() };

  if (message.type === "remplir") {
    const etat = etatPage();
    if (etat !== "pret") return { ok: false, etat };
    try {
      await remplir(message.article, message.photos);
      const ecarts = await controler(message.article, message.photos.length);
      if (ecarts.length > 0)
        return { ok: false, message: `Contrôle avant envoi : ${ecarts.join(" ; ")}. Rien n'a été publié.` };
      if (!boutonAjouter())
        return { ok: false, message: "Bouton « Ajouter » introuvable (à calibrer). Rien n'a été publié." };
      return { ok: true };
    } catch (erreur) {
      // Une vérification apparue en cours de route prime sur l'erreur de champ.
      const apres = etatPage();
      if (apres !== "pret") return { ok: false, etat: apres };
      return { ok: false, message: erreur instanceof Error ? erreur.message : String(erreur) };
    }
  }

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
