// TOUT ce qui dépend de la page Vinted est ici : sélecteurs du formulaire « Vendre un article » et signes d'arrêt.
// Rédigé SANS consulter Vinted (valeurs probables) : à calibrer sur le PC de l'utilisateur, en mode essai.
// Pour chaque champ, plusieurs sélecteurs possibles : le premier présent dans la page est utilisé.
/* exported SELECTEURS */

const SELECTEURS = {
  champs: {
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
  },

  /** Champ de recherche affiché dans une liste de choix (marque, taille…), s'il existe. */
  rechercheDansListe: ['[data-testid$="-search-input"]', 'input[type="search"]'],

  /**
   * Options cliquables d'une liste de choix ouverte (on retient celle dont le texte correspond). Relevé du 07/10/2026 :
   * la liste des catégories est `[data-testid="catalog-select-dropdown-content"]`, chaque catégorie une case
   * `div[role="button"][id^="catalog-"]`. On ne cherche QUE dans les listes ouvertes : le menu du haut de Vinted
   * contient aussi « Femmes », « Hommes »…
   */
  options: [
    '[data-testid$="-dropdown-content"] [role="button"]',
    '[data-testid$="-dropdown-content"] [role="option"]',
    '[data-testid$="-dropdown-content"] [role="radio"]',
    '[data-testid$="-dropdown-content"] [role="checkbox"]',
    '[role="option"]',
    '[data-testid$="-option"]',
  ],

  /** Zones où une option n'est jamais cherchée (menu de navigation du site). */
  horsOptions: 'header, nav, [role="tablist"]',

  /** Vignettes des photos déposées dans le formulaire (leur nombre est contrôlé avant l'envoi). */
  photosDeposees: ['[data-testid="image-grid"] img', '[data-testid^="media-select-item"] img'],

  boutonAjouter: ['[data-testid="upload-form-save-button"]'],
  texteBoutonAjouter: "Ajouter",

  /** Page d'une annonce créée : https://www.vinted.fr/items/1234567890-titre */
  motifAnnonceCreee: "^/items/\\d+",

  /** Signes que l'utilisateur n'est pas connecté. */
  nonConnecte: ['[data-testid="header--login-button"]', 'a[href*="/member/signup"]', 'a[href*="/login"]'],

  /** Signes d'une vérification anti-robot : l'extension se met en pause, l'utilisateur la fait lui-même. */
  verification: ['iframe[src*="captcha"]', 'iframe[title*="captcha" i]', "#px-captcha", '[data-testid="captcha"]'],

  /** Textes de la page « session bloquée » : l'extension se met en pause, rien n'est rechargé. */
  textesBlocage: [
    "ta session a été bloquée",
    "votre session a été bloquée",
    "activité inhabituelle",
    "your session has been blocked",
    "unusual activity",
  ],
};
