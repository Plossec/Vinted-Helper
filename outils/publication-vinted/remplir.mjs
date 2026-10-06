// Remplissage et contrôle du formulaire Vinted à partir d'une demande de l'application.
// Règle : au moindre doute (champ introuvable, valeur différente), on s'arrête SANS cliquer « Ajouter ».
import { CHAMPS, OPTION, PHOTOS_DEPOSEES, RECHERCHE_DANS_LISTE } from "./selecteurs.mjs";

export class ErreurPublication extends Error {}

const DELAI_MS = 10_000;

/** Premier élément présent parmi plusieurs sélecteurs possibles, ou null. */
export async function premier(page, selecteurs, delai = DELAI_MS) {
  const fin = Date.now() + delai;
  do {
    for (const s of selecteurs) {
      const loc = page.locator(s).first();
      if ((await loc.count()) > 0) return loc;
    }
    await page.waitForTimeout(250);
  } while (Date.now() < fin);
  return null;
}

async function champ(page, nom, obligatoire = true) {
  const loc = await premier(page, CHAMPS[nom], obligatoire ? DELAI_MS : 1500);
  if (!loc && obligatoire) throw new ErreurPublication(`Champ « ${nom} » introuvable sur la page Vinted (à calibrer).`);
  return loc;
}

/** Ouvre une liste de choix et clique l'option portant ce texte (recherche tapée si la liste en propose une). */
async function choisir(page, nom, texte, { fermer = false } = {}) {
  const loc = await champ(page, nom);
  await loc.click();
  const recherche = await premier(page, RECHERCHE_DANS_LISTE, 800);
  if (recherche && (await recherche.isVisible())) await recherche.fill(texte);
  const option = page.locator(OPTION(texte)).first();
  try {
    await option.waitFor({ state: "visible", timeout: DELAI_MS });
  } catch {
    throw new ErreurPublication(`« ${texte} » introuvable dans la liste « ${nom} » de Vinted.`);
  }
  await option.click();
  if (fermer) await page.keyboard.press("Escape");
}

export async function remplir(page, article, fichiersPhotos) {
  const photos = await champ(page, "photos");
  await photos.setInputFiles(fichiersPhotos);
  await (await champ(page, "titre")).fill(article.titre);
  await (await champ(page, "description")).fill(article.description);

  // Catégorie : on descend l'arbre niveau par niveau (Hommes › Vêtements › Jeans › Jeans droits).
  const categorie = await champ(page, "categorie");
  await categorie.click();
  for (const niveau of article.categorie) {
    const option = page.locator(OPTION(niveau)).first();
    try {
      await option.waitFor({ state: "visible", timeout: DELAI_MS });
    } catch {
      throw new ErreurPublication(
        `Catégorie « ${niveau} » introuvable sur Vinted (chemin : ${article.categorie.join(" › ")}).`,
      );
    }
    await option.click();
  }

  await choisir(page, "marque", article.marque);
  if (article.taille) {
    // Certaines catégories n'ont pas de taille : champ facultatif.
    if (await champ(page, "taille", false)) await choisir(page, "taille", article.taille);
  }
  await choisir(page, "etat", article.etat);
  for (const couleur of article.couleurs) await choisir(page, "couleur", couleur, { fermer: true });
  await (await champ(page, "prix")).fill(article.prix);
  if (await champ(page, "colis", false)) {
    const libelle = { petit: "Petit", moyen: "Moyen", grand: "Grand" }[article.formatColis] ?? "Petit";
    await choisir(page, "colis", libelle);
  }
}

const normaliser = (t) =>
  String(t ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Valeur affichée d'un champ (saisie ou liste de choix). */
async function valeur(loc) {
  return loc.evaluate((el) => ("value" in el && typeof el.value === "string" ? el.value : (el.textContent ?? "")));
}

/**
 * Contrôle avant envoi : chaque champ est relu dans la page. Renvoie la liste des écarts (vide = on peut publier).
 */
export async function controler(page, article, nombrePhotos) {
  const ecarts = [];
  const attendu = async (nom, texte, mode = "egal") => {
    const loc = await champ(page, nom, false);
    if (!loc) return ecarts.push(`${nom} : champ introuvable`);
    const lu = normaliser(await valeur(loc));
    const voulu = normaliser(texte);
    const ok = mode === "egal" ? lu === voulu : lu.includes(voulu);
    if (!ok) ecarts.push(`${nom} : « ${lu} » au lieu de « ${voulu} »`);
  };
  await attendu("titre", article.titre);
  await attendu("description", article.description);
  await attendu("prix", article.prix, "contient");
  await attendu("categorie", article.categorie.at(-1) ?? "", "contient");
  await attendu("marque", article.marque, "contient");
  await attendu("etat", article.etat, "contient");
  for (const couleur of article.couleurs) await attendu("couleur", couleur, "contient");
  const deposees = await premier(page, PHOTOS_DEPOSEES, 3000);
  const nombre = deposees ? await page.locator(PHOTOS_DEPOSEES.join(", ")).count() : 0;
  if (nombre < nombrePhotos) ecarts.push(`photos : ${nombre} déposée(s) sur ${nombrePhotos}`);
  return ecarts;
}
