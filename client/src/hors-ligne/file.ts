// File d'attente des actions terrain (§2.2) : chaque action est d'abord enregistrée sur le téléphone,
// puis envoyée au serveur dans l'ordre, avec renvoi automatique. Les identifiants sont générés sur le
// téléphone (UUID) : un renvoi ne crée jamais de doublon côté serveur.
// Ce fichier ne contient que la logique (testable sans navigateur) ; le stockage est fourni à part.

export interface CorpsSortie {
  id: string;
  date: string;
  /** Lieu choisi dans la liste, ou nom saisi librement (le serveur le retrouve ou le crée). */
  lieuId?: string;
  lieuNom?: string;
  notes: string | null;
}

export interface CorpsAchat {
  id: string;
  articleIds: string[];
  sortieId: string | null;
  /** Centimes. */
  prixTotal: number;
  photoId: string | null;
  date: string;
}

export type Operation =
  | { type: "sortie"; corps: CorpsSortie }
  | { type: "essence"; sortieId: string; montantEssence: number }
  | { type: "photo"; photoId: string; typePhoto: "terrain" | "annonce"; image: Blob }
  | { type: "achat"; corps: CorpsAchat }
  | { type: "annulation-sortie"; sortieId: string };

export interface ElementFile {
  /** Identifiant de l'élément dans la file. */
  cle: string;
  /** Ordre d'envoi (horodatage de création, en millisecondes). */
  creeLe: number;
  operation: Operation;
  /** Message du serveur si l'envoi a été refusé (l'élément est alors mis de côté). */
  erreur: string | null;
}

/** Stockage persistant de la file (IndexedDB sur le téléphone, mémoire dans les tests). */
export interface StockageFile {
  lister(): Promise<ElementFile[]>;
  ecrire(element: ElementFile): Promise<void>;
  supprimer(cle: string): Promise<void>;
}

/** Résultat d'un envoi. */
export type ResultatEnvoi =
  | { etat: "envoye" }
  /** Pas de réseau ou serveur injoignable : on réessaiera plus tard. */
  | { etat: "reseau" }
  /** Session expirée : on garde tout et on attend la reconnexion. */
  | { etat: "connexion" }
  /** Refus du serveur (donnée invalide) : l'élément est mis de côté avec le message. */
  | { etat: "refuse"; message: string };

export type Envoyeur = (operation: Operation) => Promise<ResultatEnvoi>;

export type BilanEnvoi = "termine" | "reseau" | "connexion";

/** Éléments dans l'ordre d'envoi. */
export async function listerDansLOrdre(stockage: StockageFile): Promise<ElementFile[]> {
  return (await stockage.lister()).sort((a, b) => a.creeLe - b.creeLe || a.cle.localeCompare(b.cle));
}

/**
 * Envoie les éléments en attente, dans l'ordre. S'arrête au premier problème de réseau ou de connexion
 * (les suivants dépendent souvent du précédent : sortie avant achat, photo avant achat).
 * Les éléments refusés restent dans la file, marqués en erreur, et ne sont plus renvoyés automatiquement.
 */
export async function envoyerFile(stockage: StockageFile, envoyer: Envoyeur): Promise<BilanEnvoi> {
  for (const element of await listerDansLOrdre(stockage)) {
    if (element.erreur !== null) continue;
    let resultat: ResultatEnvoi;
    try {
      resultat = await envoyer(element.operation);
    } catch {
      resultat = { etat: "reseau" };
    }
    if (resultat.etat === "envoye") await stockage.supprimer(element.cle);
    else if (resultat.etat === "refuse") await stockage.ecrire({ ...element, erreur: resultat.message });
    else return resultat.etat;
  }
  return "termine";
}

/** Convertit une réponse HTTP en résultat d'envoi. */
export async function interpreterReponse(reponse: Response): Promise<ResultatEnvoi> {
  if (reponse.ok) return { etat: "envoye" };
  if (reponse.status === 401) return { etat: "connexion" };
  if (reponse.status >= 500 || reponse.status === 408 || reponse.status === 429) return { etat: "reseau" };
  const contenu: unknown = await reponse.json().catch(() => null);
  const message =
    typeof contenu === "object" && contenu !== null && "erreur" in contenu && typeof contenu.erreur === "string"
      ? contenu.erreur
      : `Erreur ${reponse.status}`;
  return { etat: "refuse", message };
}

/**
 * Éléments de la file liés à une sortie (création, essence, achats et leurs photos terrain) : à retirer du
 * téléphone quand la sortie est annulée, pour qu'ils ne soient jamais envoyés.
 */
export function elementsDeLaSortie(elements: ElementFile[], sortieId: string): ElementFile[] {
  const achats = elements.filter((e) => e.operation.type === "achat" && e.operation.corps.sortieId === sortieId);
  const photos = new Set(achats.map((e) => (e.operation.type === "achat" ? e.operation.corps.photoId : null)));
  return elements.filter((e) => {
    const op = e.operation;
    switch (op.type) {
      case "sortie":
        return op.corps.id === sortieId;
      case "essence":
      case "annulation-sortie":
        return op.sortieId === sortieId;
      case "achat":
        return op.corps.sortieId === sortieId;
      case "photo":
        return photos.has(op.photoId);
    }
  });
}

/** Envoi réel au serveur. */
export const envoyerAuServeur: Envoyeur = async (operation) => {
  const json = (methode: string, chemin: string, corps: unknown) =>
    fetch(chemin, {
      method: methode,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
  let reponse: Response;
  switch (operation.type) {
    case "sortie":
      reponse = await json("POST", "/api/sorties", operation.corps);
      break;
    case "essence":
      reponse = await json("PUT", `/api/sorties/${operation.sortieId}/essence`, {
        montantEssence: operation.montantEssence,
      });
      break;
    case "photo":
      reponse = await fetch(`/api/photos/${operation.photoId}?type=${operation.typePhoto}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": operation.image.type || "image/jpeg" },
        body: operation.image,
      });
      break;
    case "achat":
      reponse = await json("POST", "/api/achats", operation.corps);
      break;
    case "annulation-sortie":
      reponse = await fetch(`/api/sorties/${operation.sortieId}`, { method: "DELETE", credentials: "same-origin" });
      break;
  }
  return interpreterReponse(reponse);
};

/** Stockage en mémoire (tests, ou navigateur sans IndexedDB). */
export function creerStockageMemoire(): StockageFile {
  const elements = new Map<string, ElementFile>();
  return {
    lister: async () => [...elements.values()],
    ecrire: async (e) => {
      elements.set(e.cle, e);
    },
    supprimer: async (cle) => {
      elements.delete(cle);
    },
  };
}
