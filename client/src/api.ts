// Appels à l'API du serveur (même adresse que l'interface, cookie de session envoyé automatiquement).
import type { Statut } from "./statuts.js";
import { messageErreur } from "./outils/erreurs.js";

export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message);
    this.name = "ErreurApi";
  }
}

/** Abonnés prévenus après chaque modification réussie (ex. cache des alertes, #131). */
const apresModification = new Set<() => void>();
export function surModification(abonne: () => void): () => void {
  apresModification.add(abonne);
  return () => apresModification.delete(abonne);
}

async function appeler<T>(methode: string, chemin: string, corps?: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(chemin, {
      method: methode,
      credentials: "same-origin",
      headers: corps === undefined ? {} : { "Content-Type": "application/json" },
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
  } catch {
    throw new ErreurApi(0, "Serveur injoignable. Vérifiez votre connexion.");
  }
  const contenu: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    if (reponse.status === 401 && chemin !== "/api/connexion" && window.location.pathname !== "/connexion") {
      window.location.assign("/connexion"); // session expirée : retour à l'écran de connexion
    }
    throw new ErreurApi(reponse.status, messageErreur(contenu, reponse.status));
  }
  if (methode !== "GET") apresModification.forEach((f) => f());
  return contenu as T;
}

export const api = {
  get: <T>(chemin: string) => appeler<T>("GET", chemin),
  post: <T>(chemin: string, corps: unknown = {}) => appeler<T>("POST", chemin, corps),
  put: <T>(chemin: string, corps: unknown) => appeler<T>("PUT", chemin, corps),
  delete: <T>(chemin: string) => appeler<T>("DELETE", chemin),
};

/** Envoie une photo (contenu brut) avec un identifiant généré sur l'appareil. */
export async function envoyerPhoto(image: Blob, type: "terrain" | "annonce"): Promise<string> {
  const id = crypto.randomUUID();
  let reponse: Response;
  try {
    reponse = await fetch(`/api/photos/${id}?type=${type}`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": image.type || "image/jpeg" },
      body: image,
    });
  } catch {
    throw new ErreurApi(0, "Serveur injoignable. Vérifiez votre connexion.");
  }
  if (!reponse.ok) {
    const contenu: unknown = await reponse.json().catch(() => null);
    throw new ErreurApi(reponse.status, messageErreur(contenu, reponse.status));
  }
  return id;
}

/** Envoie une image brute à une adresse de l'API et renvoie la réponse (ex. lecture d'étiquette). */
export async function envoyerImage<T>(chemin: string, image: Blob): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(chemin, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": image.type || "image/jpeg" },
      body: image,
    });
  } catch {
    throw new ErreurApi(0, "Serveur injoignable. Vérifiez votre connexion.");
  }
  const contenu: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, messageErreur(contenu, reponse.status));
  }
  return contenu as T;
}

/**
 * Version des adresses d'images : avant l'issue #39, les images étaient gardées une semaine par le navigateur sans
 * redemander au serveur ; une nouvelle adresse ignore ces anciennes copies (désormais revérifiées à chaque affichage).
 */
const VERSION_IMAGES = 2;
export const urlPhoto = (id: string) => `/api/photos/${id}?c=${VERSION_IMAGES}`;
export const urlVignette = (id: string) => `/api/photos/${id}/vignette?c=${VERSION_IMAGES}`;

// --- Types échangés avec le serveur (montants en centimes, dates au format ISO) ---

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
  sortieStock: { motif: MotifSortie; canal: CanalRevente | null; prixRevente: number | null; date: string } | null;
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

export const LIBELLES_MOTIF: Record<MotifSortie, string> = {
  donne: "Donné",
  jete: "Jeté",
  revendu: "Revendu hors Vinted",
  garde: "Gardé pour moi",
  perdu: "Perdu",
  a_vendre: "À vendre hors Vinted",
};

export const LIBELLES_CANAL: Record<CanalRevente, string> = {
  vide_grenier: "Vide-grenier",
  leboncoin: "Leboncoin",
  main_propre: "Main propre",
  autre: "Autre",
};

export interface Vente {
  id: string;
  montantCredite: number;
  emballage: number;
  dateVente: string;
  dateEnvoi: string | null;
  dateFinalisation: string | null;
  annulee: boolean;
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

export interface ReglagesUtilisateur {
  emballageDefaut: number;
  delaiBrouillon: number;
  delaiDormant: number;
  promptAnnonce: string | null;
  promptEtiquette: string | null;
  formatColisDefaut: string;
  // Tâches automatisées (#147) : plage horaire (heure de Paris), mode essai, tâche « Articles dormants ».
  tachesHeureDebut: number;
  tachesHeureFin: number;
  tachesEssai: boolean;
  dormantsActive: boolean;
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
}

/** Action d'une tâche automatisée sur Vinted (#147). */
export interface ActionVinted {
  id: string;
  articleId: string;
  reference: number;
  nom: string | null;
  type: "baisse" | "republication";
  etat: "a_valider" | "en_attente" | "en_cours" | "faite" | "essai" | "erreur" | "refusee" | "annulee";
  prixAvant: number;
  prixApres: number | null;
  essai: boolean;
  message: string | null;
  url: string | null;
  creeLe: string;
  finLe: string | null;
}

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
