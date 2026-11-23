// Types des réponses de l'API (#244) : SOURCE UNIQUE, partagée par le serveur et l'interface (client/src/api.ts les
// réimporte « en type seulement » : aucun code du serveur n'arrive dans l'application). Montants en centimes, dates au
// format ISO (texte). Le serveur vérifie ses réponses avec `conforme<…>()` (./conforme.ts) : un champ renommé ou
// retiré d'un côté est une erreur de compilation, plus une surprise à l'écran.
// Ce fichier ne contient que des types et n'importe que des types sans dépendance (navigateur compris).
import type { Statut } from "../metier/statuts.js";

export type { Statut };

export interface Sante {
  application: string;
  version: string;
  base: "connectée" | "indisponible";
}

export interface ValeurListe {
  id: string;
  nom: string;
}

export interface Lieu extends ValeurListe {
  estMaison: boolean;
}

export interface Categorie {
  /** Ex. « hommes/vetements/jeans/jeans-slim ». */
  code: string;
  /** Ex. ["Hommes", "Vêtements", "Jeans", "Jeans slim"]. */
  chemin: string[];
}

export interface Etat {
  code: string;
  libelle: string;
}

export interface Referentiels {
  lieux: Lieu[];
  marques: ValeurListe[];
  /** Arbre fixe calqué sur Vinted (catégories sélectionnables uniquement). */
  categories: Categorie[];
  /** Liste fixe des 6 états. */
  etats: Etat[];
  /** Couleurs Vinted et formats de colis (publication sur Vinted). */
  couleurs: Etat[];
  formatsColis: Etat[];
}

/** Listes complétables par l'utilisateur. */
export type TypeListe = "lieux" | "marques";

export interface ResumeArticle {
  id: string;
  reference: number;
  nom: string | null;
  statut: Statut;
  prixAffiche: number | null;
  categorie: string | null;
  marqueId: string | null;
  marque: string | null;
  gamme: string | null;
  taille: string | null;
  lieuId: string | null;
  sortieId: string | null;
  dateAchat: string | null;
  creeLe: string;
  /** Date du dernier changement de statut (ancienneté dans le statut). */
  dateStatut: string | null;
  /** Date de la dernière mise en ligne. */
  dateMiseEnLigne: string | null;
  /** Photo à afficher en vignette (identifiant), ou null. */
  vignette: string | null;
  /** Lien de l'annonce Vinted, ou null. */
  urlVinted: string | null;
  /** Centimes, calculés par le serveur : prix d'achat (part du lot comprise) et bénéfice (réalisé ou provisoire). */
  prixAchat: number | null;
  benefice: number | null;
  beneficeRealise: boolean;
  /** À publier / Erreur : ce qui empêche la publication automatique (#196), vide si rien. */
  manquesPublication: string[];
}

export interface PhotoArticle {
  id: string;
  type: "terrain" | "annonce";
  ordre: number;
  estPrincipale: boolean;
}

export interface ResumeSortie {
  id: string;
  date: string;
  lieuId: string;
  lieu: string;
  montantEssence: number;
  notes: string | null;
  nombreArticles: number;
}

export interface Sortie extends Omit<ResumeSortie, "nombreArticles"> {
  /** Essence comptée en frais général tant que la sortie n'a aucun article (§6.2). */
  essenceFraisGeneral: number;
  articles: {
    id: string;
    reference: number;
    nom: string | null;
    statut: Statut;
    lotId: string | null;
    prixAchat: number;
    essence: number;
    vignette: string | null;
  }[];
}

export interface ChangementStatut {
  id: string;
  de: Statut | null;
  vers: Statut;
  date: string;
}

export interface Article {
  id: string;
  reference: number;
  nom: string | null;
  categorie: string | null;
  marqueId: string | null;
  etat: string | null;
  gamme: string | null;
  taille: string | null;
  matiere: string | null;
  notes: string | null;
  lieuId: string | null;
  sortieId: string | null;
  sortie: { id: string; date: string; lieu: string } | null;
  lot: { id: string; prixTotal: number; articles: { id: string; reference: number }[] } | null;
  /** Prix saisi (article hors lot) ; null pour un article de lot. */
  prixAchat: number | null;
  /** Montants calculés par le serveur (centimes, §6.5). */
  couts: Couts;
  /** Vente (colis) en cours ou finalisée de l'article. */
  vente: {
    id: string;
    montantCredite: number;
    emballage: number;
    dateVente: string;
    dateEnvoi: string | null;
    dateFinalisation: string | null;
    nombreArticles: number;
  } | null;
  boosts: { id: string; montant: number; date: string }[];
  historiquePrix: { prix: number; date: string }[];
  /** Vente concernée par un dépôt ou un retrait en point relais (#210) : colis en cours ou retour À récupérer. */
  pointsRelais: { venteId: string; pointDepotId: string | null; pointRetraitId: string | null } | null;
  sortieStock: {
    motif: MotifSortie;
    canal: CanalRevente | null;
    prixRevente: number | null;
    /** Vide seulement pour une donnée incohérente (la base l'autorise) : rien n'est alors affiché. */
    date: string | null;
  } | null;
  titreAnnonce: string | null;
  descriptionAnnonce: string | null;
  couleurs: string[];
  formatColis: string | null;
  /** Lien de l'annonce publiée sur Vinted. */
  urlVinted: string | null;
  /** Lien de la conversation Vinted avec l'acheteur (issue #48). */
  urlConversation: string | null;
  /** Article en Erreur (#72) : message de la dernière publication Vinted en échec. */
  erreurPublication: string | null;
  photos: PhotoArticle[];
  dateAchat: string | null;
  statut: Statut;
  prixAffiche: number | null;
  /** Prix de vente minimum accepté (information ; #146). */
  prixVenteMinimum: number | null;
  /** Tâche « Articles dormants » (#147) : règle de baisse de l'article (« compte » = réglage du compte). */
  baisseRegle: ReglageBaisse;
  /** Pourcentage entier ou centimes, selon la règle. */
  baisseValeur: number | null;
  transitionsPossibles: Statut[];
  historiqueStatuts: ChangementStatut[];
}

/** Baisse automatique d'un article dormant (#147) ; « aucune » = ne pas baisser le prix. */
export type ReglageBaisse = "compte" | "pourcentage" | "montant" | "aucune";

export interface DonneesArticle {
  nom: string;
  lieuId: string;
  /** Null pour un article de lot (le prix vient du lot). */
  prixAchat: number | null;
  dateAchat: string;
  categorie: string;
  marqueId: string;
  etat: string;
  gamme: string | null;
  taille: string | null;
  matiere: string | null;
  notes: string | null;
  prixAffiche: number | null;
  prixVenteMinimum: number | null;
  couleurs: string[];
  formatColis: string | null;
  baisseRegle: ReglageBaisse;
  baisseValeur: number | null;
}

export interface Couts {
  prixAchat: number;
  essence: number;
  emballage: number;
  boosts: number;
  coutTotal: number;
  prixVendu: number | null;
  venteId: string | null;
  /** Réalisé (Finalisé, Sortie du stock) ou provisoire. */
  benefice: number;
  realise: boolean;
  /** Vendu non finalisé : prix vendu − coût total, calculé par le serveur (#105) ; sinon null. */
  beneficeAttendu: number | null;
}

export type MotifSortie = "donne" | "jete" | "revendu" | "garde" | "perdu" | "a_vendre";
export type CanalRevente = "vide_grenier" | "leboncoin" | "main_propre" | "autre";

export interface Vente {
  id: string;
  montantCredite: number;
  emballage: number;
  dateVente: string;
  dateEnvoi: string | null;
  dateFinalisation: string | null;
  annulee: boolean;
  /** Point relais où déposer le colis, et où récupérer un retour (#210). */
  pointDepotId: string | null;
  pointRetraitId: string | null;
  articles: {
    id: string;
    reference: number;
    nom: string | null;
    statut: Statut;
    prixAffiche: number;
    retourne: boolean;
    prixVendu: number | null;
    partEmballage: number;
  }[];
}

/** Point relais de l'utilisateur (#210), saisi à la main. */
export interface PointRelais {
  id: string;
  transporteur: string;
  nom: string;
  adresse: string | null;
  numero: string | null;
  url: string | null;
  /** 7 jours (lundi → dimanche), plages « HH:MM », heure de Paris. */
  horaires: Horaires;
  notes: string | null;
  archive: boolean;
}

export interface ListePointsRelais {
  transporteurs: Etat[];
  points: PointRelais[];
}

export interface ReglagesUtilisateur {
  emballageDefaut: number;
  delaiBrouillon: number;
  delaiDormant: number;
  promptAnnonce: string | null;
  promptEtiquette: string | null;
  formatColisDefaut: string;
  // Tâches automatisées (#147) ; plage horaire (heure de Paris) et mode essai propres à chaque tâche (#232).
  // Tâche « Articles dormants ».
  dormantsActive: boolean;
  dormantsHeureDebut: number;
  dormantsHeureFin: number;
  dormantsEssai: boolean;
  dormantsMode: "automatique" | "manuel";
  dormantsBaisseType: "pourcentage" | "montant";
  /** Pourcentage entier ou centimes. */
  dormantsBaisseValeur: number;
  dormantsFrequenceHeures: number;
  /** Secondes. */
  dormantsPauseBaisse: number;
  dormantsPauseRepublication: number;
  dormantsPlafondBaisses: number;
  dormantsPlafondRepublications: number;
  // Tâche « Vérification vente finalisée » (#148).
  finalisationActive: boolean;
  finalisationHeureDebut: number;
  finalisationHeureFin: number;
  finalisationEssai: boolean;
  finalisationMode: "automatique" | "manuel";
  finalisationFrequenceHeures: number;
  /** Secondes. */
  finalisationPause: number;
  finalisationPlafond: number;
  // Tâche « Négociation favoris » (#149).
  favorisActive: boolean;
  favorisHeureDebut: number;
  favorisHeureFin: number;
  favorisEssai: boolean;
  favorisMode: "automatique" | "manuel";
  /** Jours entre le favori et l'offre. */
  favorisDelaiJours: number;
  favorisFrequenceHeures: number;
  /** Secondes. */
  favorisPause: number;
  favorisPlafond: number;
  // Tâche « Offres reçues » (#150).
  offresRecuesActive: boolean;
  offresRecuesHeureDebut: number;
  offresRecuesHeureFin: number;
  offresRecuesEssai: boolean;
  offresRecuesMode: "automatique" | "manuel";
  offresRecuesDelaiJours: number;
  offresRecuesFrequenceHeures: number;
  offresRecuesPause: number;
  offresRecuesPlafond: number;
}

/** Commande terminée lue sur Vinted (#148), rattachée ou non à une vente de l'application. */
export interface CommandeVinted {
  id: string;
  idCommande: string;
  annonces: string[];
  dateFin: string;
  /** Centimes crédités par Vinted, s'ils ont été lus. */
  montant: number | null;
  /** Centimes : montant de l'application avant correction. */
  montantAvant: number | null;
  etat: "a_valider" | "a_rattacher" | "appliquee" | "refusee" | "ignoree";
  message: string | null;
  vente: {
    id: string;
    montantCredite: number | null;
    articles: { id: string; reference: number; nom: string | null }[];
  } | null;
}

/** Action d'une tâche automatisée sur Vinted (#147). */
export interface ActionVinted {
  id: string;
  articleId: string;
  reference: number;
  nom: string | null;
  /** « offre » : offre aux favoris (#149) ; prixApres = prix de l'offre. */
  type: "baisse" | "republication" | "offre";
  etat: "a_valider" | "en_attente" | "en_cours" | "faite" | "essai" | "erreur" | "refusee" | "annulee";
  prixAvant: number;
  prixApres: number | null;
  essai: boolean;
  message: string | null;
  url: string | null;
  creeLe: string;
  finLe: string | null;
}

/** Offre reçue lue par l'extension (contenu de GET /api/v2/inbox / GET /api/v2/conversations/{id}). */
export interface OffreRecueLu {
  /** Identifiant de l'offre sur Vinted (transaction / message) — unicité de lecture. */
  offreId: string;
  /** Numéro de l'annonce Vinted (« 123 » de /items/123-…), vide s'il n'a pas été lu. */
  articleId: string;
  /** Identifiant de la transaction Vinted, si lu. */
  transactionId: string | null;
  /** Identifiant de la demande d'offre, si lu. */
  offerRequestId: string | null;
  /** Centimes : prix de l'offre. */
  prixOffre: number;
  depuis: string;
  message?: string | null;
}

/** Offre reçue à valider en « À faire » (écran dédié, lignes de GET /api/taches/offres-recues). */
export interface OffreRecueLigne {
  id: string;
  articleId: string;
  reference: number;
  nom: string | null;
  /** Centimes : prix de l'offre reçue. */
  prixOffre: number;
  /** Centimes : contre-offre prévue en mode manuel ; null (acceptation, signalement). */
  prixContreOffre: number | null;
  message: string | null;
  depuis: string;
}

/** État de chaque tâche automatisée (#232) : dates ISO, passage automatique prévu (null : désactivée). */
export interface EtatTaches {
  dormants: {
    active: boolean;
    essai: boolean;
    dernierPassage: string | null;
    prochainPassage: string | null;
    aujourdhui: { republications: number; plafondRepublications: number };
  };
  finalisation: {
    active: boolean;
    essai: boolean;
    dernierPassage: string | null;
    prochainPassage: string | null;
    /** « Lancer maintenant » en attente du passage de l'extension. */
    lancementDemande: string | null;
    aujourdhui: { finalisees: number; plafond: number };
  };
  /** Offres aux favoris (#149). */
  favoris: {
    active: boolean;
    essai: boolean;
    dernierPassage: string | null;
    prochainPassage: string | null;
    lancementDemande: string | null;
    aujourdhui: { offres: number; plafond: number };
  };
}

export type TacheAutomatique = "dormants" | "finalisation" | "favoris";
export type EtatJournal = Exclude<ActionVinted["etat"], "a_valider">;

/** Ligne du journal des tâches (#233) : une action des articles dormants, ou une lecture des ventes finalisées. */
export type LigneJournal = {
  id: string;
  etat: EtatJournal;
  date: string;
  essai: boolean;
  /** Lancée avec « Lancer maintenant ». */
  manuelle: boolean;
  /** Raison d'une erreur, ou message de l'action. */
  message: string | null;
  /** Un relevé de la page a été enregistré dans l'extension (« Dernier relevé »). */
  releve: boolean;
} & (
  | {
      /** « favoris » : offre aux favoris (#149), type « offre », prixApres = prix de l'offre. */
      tache: "dormants" | "favoris";
      action: {
        type: "baisse" | "republication" | "offre";
        prixAvant: number;
        prixApres: number | null;
        url: string | null;
        article: { id: string; reference: number; nom: string | null };
      };
    }
  | {
      tache: "finalisation";
      lecture: { lues: number; nouvelles: number; finalisees: number; aValider: number; aRattacher: number };
    }
);

export type EtatPublication = "en_attente" | "en_cours" | "publie" | "essai" | "erreur" | "annule";

export interface Publication {
  id: string;
  articleId: string;
  reference: number;
  nom: string | null;
  etat: EtatPublication;
  essai: boolean;
  message: string | null;
  demandeLe: string;
  finLe: string | null;
  urlVinted: string | null;
}

export interface ReponsePublication {
  acceptes: number[];
  refuses: { reference: number; nom: string | null; manques: string[] }[];
}

export interface FraisDivers {
  id: string;
  date: string;
  montant: number;
  libelle: string;
}

/** Plage d'ouverture d'un point relais (#210), « HH:MM » heure de Paris. */
export interface Plage {
  debut: string;
  fin: string;
}

/** 7 jours, du lundi au dimanche. */
export type Horaires = Plage[][];

/** Réponse de PUT /api/articles/:id/lien-vinted. */
export interface ReponseLien {
  article: Article;
  passeEnLigne: boolean;
  prixManquant: boolean;
}

/** Suivi de la publication Vinted (GET /api/publications). */
export interface SuiviPublication {
  publications: Publication[];
  extensionVueLe: string | null;
  /** @deprecated Ancien nom de extensionVueLe (#246), pour une interface d'avant la mise à jour. À retirer. */
  programmeVuLe: string | null;
  jetonCree: boolean;
}

/** Actions des tâches automatisées à valider (GET /api/taches/actions). */
export interface ActionsAValider {
  aValider: ActionVinted[];
}

/** Commandes lues sur Vinted (GET /api/taches/commandes). */
export interface CommandesVintedListe {
  aValider: CommandeVinted[];
  aRattacher: CommandeVinted[];
  montantsCorriges: CommandeVinted[];
}

/** Article de la corbeille (GET /api/corbeille). */
export interface ArticleSupprime {
  id: string;
  reference: number;
  nom: string | null;
  supprimeLe: string;
  suppressionLe: string;
  vignette: string | null;
}

/** Alerte (§5.8) renvoyée par GET /api/alertes. */
export interface Alerte {
  id: string;
  reference: number;
  nom: string | null;
  depuis: string;
  jours: number;
  /** Articles à expédier : lien de la conversation Vinted avec l'acheteur (issue #48). */
  urlConversation?: string | null;
  /** Articles à expédier : leur vente (bouton « Envoyé », #191). */
  venteId?: string | null;
  /** Articles À publier incomplets : ce qui manque à l'annonce (#196). */
  manques?: string[];
}

export interface AlertesServeur {
  brouillons: Alerte[];
  dormants: Alerte[];
  aExpedier: Alerte[];
  /** Retours à aller chercher (issue #52). */
  aRecuperer?: Alerte[];
  /** Publications Vinted en échec (issue #72). */
  erreursPublication?: Alerte[];
  /** Articles À publier incomplets (#196). */
  incomplets?: Alerte[];
  /** Brouillons créés par photos (#276), avec ce qui leur manque (dont l'analyse par l'IA). */
  aCompleter?: Alerte[];
  /** Dormants republiés 3 fois sans vente (#147). */
  invendus?: Alerte[];
  /** Tâches automatisées en mode manuel (#147) : nombre d'actions prévues à valider. */
  aValider?: number;
  /** Tâche « Vérification vente finalisée » (#148) : commandes à valider, à rattacher, montants corrigés. */
  commandes?: { aValider: number; aRattacher: number; montantsCorriges: number };
}

// --- Tableau de bord (GET /api/tableau-de-bord, §5.9) ---

export interface PeriodeTableau {
  chiffreAffaires: number;
  beneficeRealise: number;
  tresorerie: number;
  fraisGeneraux: number;
}

export interface Rentabilite {
  cle: string;
  libelle?: string;
  date?: string | null;
  realise: number;
  provisoire: number;
  nombreArticles: number;
  restants: number;
}

export interface Analyse {
  cle: string;
  libelle: string;
  nombreVendus: number;
  margeMoyenne: number;
  tauxMarge: number | null;
  delaiMiseEnLigneVente: number | null;
  delaiAchatVente: number | null;
}

export interface EnCours {
  chiffreAffaires: number;
  benefice: number;
}

export interface PostesTresorerie {
  encaisse: number;
  achats: number;
  essence: number;
  emballages: number;
  boosts: number;
  fraisDivers: number;
}

export interface Tableau {
  annee: number;
  /** Années d'activité, de la plus récente à la plus ancienne (issue #88). */
  annees: number[];
  mois: string;
  tresorerieDuMois: PostesTresorerie;
  duMois: PeriodeTableau;
  deLAnnee: PeriodeTableau;
  /** Ventes pas encore finalisées (À expédier, Envoyé), à la date de vente (issue #85). */
  enCours: { duMois: EnCours };
  /** Réalisé + en cours, calculé par le serveur. */
  theorique: { duMois: EnCours };
  serie: (PeriodeTableau & {
    mois: string;
    theorique: { chiffreAffaires: number; beneficeRealise: number; tresorerie: number };
  })[];
  stock: {
    coutTotal: number;
    prixAffiche: number;
    detail: Partial<Record<Statut, { nombre: number; coutTotal: number; prixAffiche: number }>>;
  };
  rentabiliteSorties: { classement: Rentabilite[]; maison: Rentabilite | null };
  rentabiliteLieux: { classement: Rentabilite[]; maison: Rentabilite | null };
  analyse: { categories: Analyse[]; marques: Analyse[]; gammes: Analyse[] };
}

/** Fusion de deux articles (#284) : ce qui sera (aperçu) ou a été repris du doublon. */
export interface BilanFusion {
  /** Champs repris du doublon (libellés). */
  champs: string[];
  /** Photos ajoutées à l'article gardé. */
  photos: number;
  /** Nouveau statut de l'article gardé (libellé), ou null s'il garde le sien. */
  statut: string | null;
  /** L'article gardé prend la place du doublon dans son lot d'achat. */
  lot: boolean;
  /** Lignes d'historique rattachées (prix, boosts, ventes, publications, tâches). */
  historique: number;
}

/** Corbeille en lot (#286) : articles traités, et références des articles vendus laissés de côté. */
export interface BilanCorbeille {
  traites: number;
  /** Références (#0127) des articles ignorés (vendus). */
  ignores: number[];
}
