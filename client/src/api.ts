// Appels à l'API du serveur (même adresse que l'interface, cookie de session envoyé automatiquement).
import type { Statut } from "./statuts.js";

export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    message: string,
  ) {
    super(message);
    this.name = "ErreurApi";
  }
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
    const message =
      typeof contenu === "object" && contenu !== null && "erreur" in contenu && typeof contenu.erreur === "string"
        ? contenu.erreur
        : `Erreur ${reponse.status}`;
    throw new ErreurApi(reponse.status, message);
  }
  return contenu as T;
}

export const api = {
  get: <T>(chemin: string) => appeler<T>("GET", chemin),
  post: <T>(chemin: string, corps: unknown = {}) => appeler<T>("POST", chemin, corps),
  put: <T>(chemin: string, corps: unknown) => appeler<T>("PUT", chemin, corps),
};

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
}

/** Listes complétables par l'utilisateur. */
export type TypeListe = "lieux" | "marques";

export interface ResumeArticle {
  id: string;
  reference: number;
  nom: string | null;
  statut: Statut;
  prixAffiche: number | null;
  creeLe: string;
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
  prixAchat: number | null;
  dateAchat: string | null;
  statut: Statut;
  prixAffiche: number | null;
  transitionsPossibles: Statut[];
  historiqueStatuts: ChangementStatut[];
}

export interface DonneesArticle {
  nom: string;
  lieuId: string;
  prixAchat: number;
  dateAchat: string;
  categorie: string;
  marqueId: string;
  etat: string;
  gamme: string | null;
  taille: string | null;
  matiere: string | null;
  notes: string | null;
  prixAffiche: number | null;
}
