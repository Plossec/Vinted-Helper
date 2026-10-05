// Coûts d'achat d'un article : prix d'achat (part de lot, §6.1) et part d'essence (§6.2).
// Toutes les parts sont recalculées à partir des données (jamais stockées) avec la fonction unique `repartir`.
// L'appelant fournit uniquement les articles « vivants » (hors corbeille) : un article supprimé ne compte plus
// et les parts sont automatiquement réparties sur les articles restants (§5.11).
import { repartir } from "./repartir.js";

export interface ArticlePourCout {
  id: string;
  /** Référence (#0127) : ordre stable et déterministe pour savoir qui est « le dernier » (règle d'arrondi). */
  reference: number;
  sortieId: string | null;
  lotId: string | null;
  /** Centimes ; ignoré pour un article de lot. */
  prixAchat: number | null;
}

export interface LotPourCout {
  id: string;
  /** Centimes. */
  prixTotal: number;
}

export interface SortiePourCout {
  id: string;
  /** Centimes. */
  montantEssence: number;
}

/** Trie par référence croissante (puis identifiant) : le dernier article reçoit le reste. */
function ordonner<T extends { reference: number; id: string }>(liste: readonly T[]): T[] {
  return [...liste].sort((a, b) => a.reference - b.reference || a.id.localeCompare(b.id));
}

/** Regroupe les articles par clé (lot ou sortie), en ignorant ceux sans clé. */
function grouper(articles: readonly ArticlePourCout[], cle: (a: ArticlePourCout) => string | null) {
  const groupes = new Map<string, ArticlePourCout[]>();
  for (const a of articles) {
    const k = cle(a);
    if (k === null) continue;
    const groupe = groupes.get(k);
    if (groupe) groupe.push(a);
    else groupes.set(k, [a]);
  }
  return groupes;
}

/** Répartit `total` à parts égales sur le groupe et écrit chaque part dans `resultat`. */
function repartirEgal(total: number, groupe: readonly ArticlePourCout[], resultat: Map<string, number>) {
  const ordonnes = ordonner(groupe);
  const parts = repartir(
    total,
    ordonnes.map(() => 1),
  );
  ordonnes.forEach((a, i) => resultat.set(a.id, parts[i] ?? 0));
}

/**
 * Prix d'achat de chaque article (centimes) — §6.1.
 * Article seul : prix saisi (0 si absent). Article de lot : part égale du prix total du lot entre les articles présents.
 */
export function prixAchatParArticle(
  articles: readonly ArticlePourCout[],
  lots: readonly LotPourCout[],
): Map<string, number> {
  const resultat = new Map<string, number>();
  const totaux = new Map(lots.map((l) => [l.id, l.prixTotal]));
  for (const a of articles) {
    if (a.lotId === null || !totaux.has(a.lotId)) resultat.set(a.id, a.prixAchat ?? 0);
  }
  for (const [lotId, groupe] of grouper(articles, (a) => (totaux.has(a.lotId ?? "") ? a.lotId : null))) {
    repartirEgal(totaux.get(lotId) ?? 0, groupe, resultat);
  }
  return resultat;
}

/** Part d'essence de chaque article (centimes) — §6.2. Article sans sortie (Maison) : 0. */
export function essenceParArticle(
  articles: readonly ArticlePourCout[],
  sorties: readonly SortiePourCout[],
): Map<string, number> {
  const resultat = new Map<string, number>(articles.map((a) => [a.id, 0]));
  const montants = new Map(sorties.map((s) => [s.id, s.montantEssence]));
  for (const [sortieId, groupe] of grouper(articles, (a) => a.sortieId)) {
    repartirEgal(montants.get(sortieId) ?? 0, groupe, resultat);
  }
  return resultat;
}

/**
 * Essence des sorties sans aucun article : comptée comme frais général (§6.2), par calcul uniquement.
 * Dès qu'un article est rattaché à la sortie, elle n'y figure plus (jamais de double comptage).
 */
export function essenceSortiesVides(
  articles: readonly ArticlePourCout[],
  sorties: readonly SortiePourCout[],
): Map<string, number> {
  const occupees = new Set(articles.map((a) => a.sortieId).filter((id) => id !== null));
  return new Map(sorties.filter((s) => !occupees.has(s.id)).map((s) => [s.id, s.montantEssence]));
}
