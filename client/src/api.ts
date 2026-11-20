// Appels à l'API du serveur (même adresse que l'interface, cookie de session envoyé automatiquement).
import type { CanalRevente, MotifSortie } from "../../server/src/api/types.js";
import { messageErreur } from "./utilitaires/erreurs.js";

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

// --- Types échangés avec le serveur : source unique dans server/src/api/types.ts (#244) ---

export type {
  ActionVinted,
  ActionsAValider,
  Alerte,
  AlertesServeur,
  Analyse,
  Article,
  ArticleSupprime,
  BilanFusion,
  CanalRevente,
  Categorie,
  ChangementStatut,
  CommandeVinted,
  CommandesVintedListe,
  Couts,
  DonneesArticle,
  EnCours,
  Etat,
  EtatJournal,
  EtatPublication,
  EtatTaches,
  FraisDivers,
  Horaires,
  Lieu,
  LigneJournal,
  ListePointsRelais,
  MotifSortie,
  PeriodeTableau,
  PhotoArticle,
  Plage,
  PointRelais,
  PostesTresorerie,
  Publication,
  Referentiels,
  ReglageBaisse,
  ReglagesUtilisateur,
  Rentabilite,
  ReponseLien,
  ReponsePublication,
  ResumeArticle,
  ResumeSortie,
  Sante,
  Sortie,
  SuiviPublication,
  Tableau,
  TacheAutomatique,
  TypeListe,
  ValeurListe,
  Vente,
} from "../../server/src/api/types.js";

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
