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
    // Relevé du 29/10/2026 (#239) : nouvelles listes, bouton `…-input` suivi d'un champ caché `select-proxy`
    // (name="size", name="condition") qui n'ouvre pas la liste : ces champs cachés ne sont plus utilisés.
    taille: [
      '[data-testid="category-size-single-grid-input"]',
      '[data-testid^="category-size-"][data-testid$="-input"]',
      '[data-testid="size-select-dropdown-input"]',
      "#size",
    ],
    etat: [
      '[data-testid="category-condition-single-list-input"]',
      '[data-testid^="category-condition-"][data-testid$="-input"]',
      '[data-testid="condition-select-dropdown-input"]',
      "#condition",
    ],
    couleur: ['[data-testid="color-select-dropdown-input"]', 'input[name="color"]', "#color"],
    // Format du colis : cases à cocher, pas une liste (relevé du 07/10/2026).
    colis: ['[data-testid$="-package-size--cell"]'],
  },

  /** Titre d'une case « format du colis » (« Petit », « Recommandé Moyen »…). */
  titreColis: '[data-testid$="-package-size--cell--title"]',

  /** Recherche de la liste des catégories : utilisée quand le chemin de l'application diffère de celui de Vinted. */
  rechercheCategorie: ["#catalog-search-input", 'input[name="catalog-search-input"]'],

  /**
   * Résultats de la recherche de catégorie (relevé du 07/10/2026) : cases `role="radio"` dont le titre est le nom
   * (« Doudounes ») et le corps le chemin (« Femmes > Vêtements > Manteaux et vestes > Vestes »).
   */
  resultatsCategorie: ['[data-testid="catalog-select-dropdown-content"] [role="radio"]'],
  titreResultat: '[class*="Cell__title"]',
  cheminResultat: '[class*="Cell__body"]',

  /** Champ de recherche affiché dans une liste de choix (marque, taille…), s'il existe. */
  rechercheDansListe: ['[data-testid$="-search-input"]', 'input[type="search"]'],

  /**
   * Options cliquables d'une liste de choix ouverte (on retient celle dont le texte correspond). Relevé du 07/10/2026 :
   * la liste des catégories est `[data-testid="catalog-select-dropdown-content"]`, chaque catégorie une case
   * `div[role="button"][id^="catalog-"]`. On ne cherche QUE dans les listes ouvertes : le menu du haut de Vinted
   * contient aussi « Femmes », « Hommes »…
   */
  // Relevé du 07/10/2026 (22:30) : la liste « État » est `[data-testid="category-condition-single-list-content"]`,
  // chaque état une case `role="radio"` (titre « Très bon état » + description) : on cherche dans tout « …-content ».
  options: [
    '[data-testid$="-content"] [role="button"]',
    '[data-testid$="-content"] [role="option"]',
    '[data-testid$="-content"] [role="radio"]',
    '[data-testid$="-content"] [role="checkbox"]',
    // Tailles : possiblement des « puces » (relevé du 07/10/2026 : `category-size-single-grid_chips-input`).
    '[data-testid$="-content"] button',
    '[role="option"]',
    '[data-testid$="-option"]',
  ],

  /**
   * Zones où une option n'est jamais cherchée : menu de navigation du site, cases « format du colis » (relevé du
   * 29/10/2026, #239 : leur `…--cell--content` contient le bouton « Voir les détails des dimensions et indemnisations »).
   */
  horsOptions: 'header, nav, [role="tablist"], [data-testid$="-package-size--cell"]',

  /** Vignettes des photos déposées dans le formulaire (leur nombre est contrôlé avant l'envoi). */
  // Relevé du 07/10/2026 : chaque photo déposée est un `[data-testid="image-wrapper-N"]` dans `media-upload-grid`.
  // On compte avec le premier repère qui trouve quelque chose (sans additionner les repères).
  photosDeposees: [
    '[data-testid^="image-wrapper-"]',
    '[data-testid="media-upload-grid"] img',
    '[data-testid="image-grid"] img',
  ],

  boutonAjouter: ['[data-testid="upload-form-save-button"]'],
  texteBoutonAjouter: "Ajouter",
  /** « Modifier l'annonce » (#147) : relevé du 21/10/2026, même repère que « Ajouter », texte « Valider ». */
  texteBoutonValider: "Valider",

  /**
   * Tâche « Articles dormants » (#147) : page d'une annonce publiée. Relevé du 21/10/2026 : boutons
   * `item-edit-button` et `item-delete-button` ; « Supprimer » ouvre la fenêtre `item-delete-modal` (« Supprimer
   * l'article ? »), le bouton de la page restant dessous : la confirmation se cherche TOUJOURS dans la fenêtre.
   */
  annonce: {
    modifier: ['[data-testid="item-edit-button"]', 'a[href$="/edit"]'],
    supprimer: ['[data-testid="item-delete-button"]'],
    /** Texte des boutons cherchés quand aucun repère ne correspond. */
    texteModifier: "Modifier l'annonce",
    texteSupprimer: "Supprimer",
    fenetreSuppression: ['[data-testid="item-delete-modal"]'],
    /** Dans la fenêtre seulement. */
    confirmerSuppression: ['[data-testid="item-delete-confirmation-button"]'],
    annulerSuppression: ['[data-testid="item-delete-cancelation-button"]'],
  },

  /**
   * Tâche « Vérification vente finalisée » (#148) : adresse du « Porte-monnaie ». Structure de la page
   * inconnue : le mode essai ouvre et relève cette page pour la calibrer.
   */
  // Adresse donnée par l'utilisateur le 18/10/2026 (« /my_orders/sold » supposé auparavant).
  pagePorteMonnaie: "/wallet/balance",

  /**
   * Capture de l'utilisateur du 21/11/2026 (#288) : le champ affiche « 4.00 » mais Vinted ne l'a pas pris en compte et
   * affiche sous le champ « Le champ prix doit être supérieur ou égal à 1.0 ». Débuts de ces messages d'erreur.
   */
  textesErreurPrix: ["le champ prix doit", "le prix doit"],

  /** Page d'une annonce créée : https://www.vinted.fr/items/1234567890-titre */
  motifAnnonceCreee: "^/items/\\d+",

  /**
   * Annonce retrouvée sur le profil quand la page de l'annonce ne s'ouvre pas après « Ajouter » (#288). PAS ENCORE
   * RELEVÉ sur Vinted (21/11/2026) : lien du profil (« /member/123-pseudo ») dans l'en-tête ou l'adresse, puis liste
   * des annonces du profil, les plus récentes d'abord (« {id} » remplacé par le numéro du membre).
   */
  motifProfil: "/member/(\\d+)",
  annoncesDuProfil: "/api/v2/wardrobe/{id}/items?page=1&per_page=20&order=newest_first",

  /**
   * Offres aux favoris (#149). Relevés de l'utilisateur du 22/11/2026 : menu des notifications (cloche de l'en-tête,
   * « Voir tout »), une notification par lien « … a marqué ton article … comme favori Fais-lui une proposition. »,
   * qui ouvre la conversation avec la fenêtre « Faire une offre » déjà ouverte (`?offer_request=true`).
   */
  favoris: {
    cloche: ['[data-testid="header-notification-button"]'],
    voirTout: ['[data-testid="header-notification-see-all-button"]'],
    notification: '[data-testid="user-notification-item"]',
    /** « pseudo a marqué ton article Titre comme favori » (texte de la notification). */
    motifFavori: "^(.+?) a marqué ton article (.+?) comme favori",
    fenetreOffre: ['[data-testid="offer-modal"]'],
    prixOffre: ['[data-testid="offer-price-field--input"]', 'input[name="offer"]'],
    envoyerOffre: ['[data-testid="offer-submit-button"]'],
    fermerOffre: ['[data-testid="offer-modal-navigation-close-button"]'],
    texteFaireOffre: "Faire une offre",
    /** Relevé du 22/11/2026 (#295) : bouton « Faire une offre » de la conversation. */
    boutonFaireOffre: ['[data-testid="make-offer-button"]'],
    /**
     * Relevé du 22/11/2026 (#295) : offre déjà faite dans la conversation (par l'acheteur ou le vendeur) : prix proposé,
     * ancien prix barré, état (« - offre acceptée »).
     */
    offreExistante: '[data-testid="offer-request-current-price-label"]',
  },

  /**
   * Points relais Vinted Go (#262), page publique https://vintedgo.com/fr/carrier-locations. Les noms de classes du site
   * se terminent par un code qui change à chaque mise à jour (« PointListItem_pointItemButton__Rd5K4 ») : seul leur
   * début est cherché. Repères de la PR #308 (relevé de l'utilisateur, novembre 2026).
   */
  vintedGo: {
    /** Page des points, après l'adresse du site (https://vintedgo.com, ou le faux site des tests). */
    page: "/fr/carrier-locations?country=fr&region=europe",
    point: ['button[class*="PointListItem_pointItemButton"]'],
    accordeon: ['button[class*="Accordion_accordionTrigger"]'],
    titresAccordeon: ["heures d'ouverture", "capacité du compartiment"],
    jour: ['li[class*="PointDetails_workingHoursItem"]'],
    contenuAccordeon: ['div[class*="PointDetails_accordionContent"]'],
  },

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
