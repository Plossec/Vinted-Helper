// TOUT ce qui dépend de la page Vinted est ici : adresses et sélecteurs du formulaire « Vendre un article ».
// Rédigé SANS consulter Vinted (valeurs probables, de mémoire) : à calibrer avec `npm run diagnostic` sur le PC.
// Pour chaque champ, plusieurs sélecteurs possibles : le premier présent dans la page est utilisé.

export const VINTED = process.env.VH_VINTED_URL ?? "https://www.vinted.fr";
export const ADRESSE_NOUVELLE_ANNONCE = `${VINTED}/items/new`;
/** Page d'une annonce créée : https://www.vinted.fr/items/1234567890-titre */
export const MOTIF_ANNONCE_CREEE = /\/items\/\d+/;

export const CHAMPS = {
  photos: ['input[type="file"]'],
  titre: ['[data-testid="title--input"]', 'input[name="title"]', "#title"],
  description: ['[data-testid="description--input"]', 'textarea[name="description"]', "#description"],
  prix: ['[data-testid="price-input--input"]', 'input[name="price"]', "#price"],
  // Listes de choix : on clique le champ, puis l'option dont le texte correspond.
  categorie: ['[data-testid="catalog-select-dropdown-input"]', 'input[name="category"]', "#category"],
  marque: ['[data-testid="brand-select-dropdown-input"]', 'input[name="brand"]', "#brand"],
  taille: ['[data-testid="size-select-dropdown-input"]', 'input[name="size"]', "#size"],
  etat: ['[data-testid="condition-select-dropdown-input"]', 'input[name="condition"]', "#condition"],
  couleur: ['[data-testid="color-select-dropdown-input"]', 'input[name="color"]', "#color"],
  colis: ['[data-testid="package-size-select-dropdown-input"]', 'input[name="package_size"]', "#package_size"],
};

/** Champ de recherche affiché dans une liste de choix (marque, taille…), s'il existe. */
export const RECHERCHE_DANS_LISTE = ['[data-testid$="-search-input"]', 'input[type="search"]'];

/** Option cliquable d'une liste de choix, par son texte. */
export const OPTION = (texte) => `[role="option"]:has-text("${texte}"), [data-testid$="-option"]:has-text("${texte}")`;

/** Vignettes des photos déjà déposées dans le formulaire (pour vérifier leur nombre avant l'envoi). */
export const PHOTOS_DEPOSEES = ['[data-testid="image-grid"] img', '[data-testid^="media-select-item"] img'];

export const BOUTON_AJOUTER = ['[data-testid="upload-form-save-button"]', 'button:has-text("Ajouter")'];

/** Signes que l'utilisateur n'est pas connecté (page de connexion, bouton « S'inscrire | Se connecter »). */
export const NON_CONNECTE = ['[data-testid="header--login-button"]', 'a[href*="/member/signup"]', 'a[href*="/login"]'];

/** Signes d'une vérification anti-robot (captcha) : le programme s'arrête, l'utilisateur la fait lui-même. */
export const VERIFICATION = [
  'iframe[src*="captcha"]',
  'iframe[title*="captcha" i]',
  "#px-captcha",
  '[data-testid="captcha"]',
];
