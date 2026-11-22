// Types de l'extension (#248, ADR-0111) : vérifiés par `npm run typecheck` (TypeScript lit le JavaScript annoté en
// JSDoc ; aucune étape de construction, l'extension reste chargée telle quelle par Chrome). Déclarations globales :
// les scripts de l'extension sont des scripts classiques, pas des modules.

/** Adresse de l'application et jeton personnel (page Réglages de l'extension). */
interface ConfigExtension {
  adresse: string;
  jeton: string;
}

interface LigneJournal {
  date: string;
  texte: string;
}

/** État du service worker, gardé dans chrome.storage.local (clé « etat »). */
interface EtatExtension {
  pause: boolean;
  raison: string | null;
  /** Prochaine publication possible (millisecondes depuis 1970). */
  prochain: number;
  /** Publication en cours (identifiant), jamais reprise automatiquement. */
  enCours: string | null;
  /** Action d'une tâche automatique en cours (identifiant). */
  actionEnCours: string | null;
  /** Offre aux favoris en cours (#149). */
  offreEnCours: string | null;
  onglet: number | null;
  journal: LigneJournal[];
}

/** Relevé de la page Vinted (diagnostic, erreur, onglet) : format en annexe de docs/guides/publication-vinted.md. */
interface Releve {
  date: string;
  etape: string;
  erreur: string | null;
  elements: unknown[];
  dialogues?: unknown[];
  apparusApresClicCategorie?: unknown[];
  selecteursTrouves: Record<string, string | null>;
  [autre: string]: unknown;
}

/** Contenu de chrome.storage.local. « vinted » et « delaiEtape » ne sont changés que par les tests. */
interface StockageExtension {
  config?: ConfigExtension | null;
  etat?: Partial<EtatExtension>;
  vinted?: string;
  delaiEtape?: number;
  diagnostic?: Releve;
  empreinteReleve?: string;
}

/** Annonce à saisir sur Vinted, telle qu'envoyée par l'application (server/src/publication/service.ts, versAnnonce). */
interface AnnonceVinted {
  reference: number;
  titre: string;
  description: string;
  /** Euros tels que saisis sur Vinted (« 12,50 »). */
  prix: string;
  /** Chemin de la catégorie dans l'arbre Vinted. */
  categorie: string[];
  marque: string;
  etat: string;
  taille: string | null;
  couleurs: string[];
  formatColis: string;
  /** Adresses des photos sur l'application. */
  photos: string[];
}

/** Photo transmise au script de contenu, encodée en base 64. */
interface PhotoTransmise {
  nom: string;
  type: string;
  base64: string;
}

/** État de la page Vinted vu par le script de contenu. */
type EtatPage = "pret" | "verification" | "bloque" | "deconnecte" | "inconnu";

/** Messages du service worker au script de contenu (contenu.js, traiter). */
type MessageContenu =
  | { type: "etat" }
  | { type: "releve-onglet" }
  | { type: "releve-page"; nom: string }
  | { type: "lire-prix" }
  | { type: "baisser-prix"; avant: string; apres: string }
  | { type: "supprimer-annonce" }
  | { type: "etape"; nom: string; article?: AnnonceVinted; photos?: PhotoTransmise[]; nombrePhotos?: number }
  | { type: "diagnostic"; niveau?: string }
  | { type: "ajouter" }
  | { type: "chercher-annonce"; titre: string }
  | { type: "lien-notifications" }
  | { type: "lire-favoris" }
  | { type: "lien-favori"; personne: string; titre: string }
  | { type: "faire-offre"; prix: string; titre: string; essai: boolean };

/** Messages des pages de l'extension (fenêtre, réglages) au service worker (service-worker.js, action). */
type MessagePage = { type: "reprendre" | "pause" | "maintenant" | "diagnostic" | "releverOnglet" | "tester" };

/** Réponse du service worker aux pages. */
interface ReponsePage {
  ok: boolean;
  message?: string;
}
