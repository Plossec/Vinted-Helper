// Coût total, prix vendu, emballage et bénéfice de chaque article — cahier des charges §6.3, §6.4, §6.5.
// Tout est recalculé à partir des données (jamais stocké), avec la fonction unique `repartir`.
import {
  type ArticlePourCout,
  essenceParArticle,
  type LotPourCout,
  prixAchatParArticle,
  type SortiePourCout,
} from "./couts.js";
import { repartir } from "./repartir.js";

export type MotifSortie = "donne" | "jete" | "revendu" | "garde" | "perdu";

export interface ArticlePourBenefice extends ArticlePourCout {
  statut: string;
  /** Renseigné quand l'article est sorti du stock (§5.7). */
  motifSortie: MotifSortie | null;
  /** Centimes : prix de revente hors Vinted (motif « revendu »). */
  prixRevente: number | null;
}

export interface LigneVente {
  articleId: string;
  /** Centimes : prix affiché au moment de la vente (poids du prorata, §6.4). */
  prixAffiche: number;
  /** Article renvoyé par l'acheteur (retour partiel) : plus de prix vendu ni d'emballage. */
  retourne: boolean;
}

export interface VentePourCalcul {
  id: string;
  /** Centimes : montant réellement crédité (nouveau montant après un retour partiel). */
  montantCredite: number;
  /** Centimes : emballage du colis. */
  emballage: number;
  /** Vente annulée (annulation ou retour du colis entier) : exclue de tous les calculs (§4.4). */
  annulee: boolean;
  lignes: LigneVente[];
}

export interface BoostPourCalcul {
  articleId: string;
  /** Centimes. */
  montant: number;
}

export interface DonneesCalcul {
  articles: readonly ArticlePourBenefice[];
  lots: readonly LotPourCout[];
  sorties: readonly SortiePourCout[];
  ventes: readonly VentePourCalcul[];
  boosts: readonly BoostPourCalcul[];
}

/** Détail des montants d'un article (centimes). */
export interface DetailArticle {
  prixAchat: number;
  essence: number;
  emballage: number;
  boosts: number;
  /** Prix d'achat + essence + emballage + boosts (§6.5). */
  coutTotal: number;
  /** Part du montant crédité (vente en cours ou finalisée), sinon null. */
  prixVendu: number | null;
  /** Vente dont l'article fait partie (non annulée, non renvoyé), sinon null. */
  venteId: string | null;
  /** Bénéfice réalisé (Finalisé, Sortie du stock) ou provisoire (tout autre statut). */
  benefice: number;
  realise: boolean;
}

/**
 * Prix vendu et emballage de chaque article vendu (§6.3, §6.4) : le montant crédité est réparti au prorata des prix
 * affichés, l'emballage à parts égales, entre les articles non renvoyés du colis (ordre : référence croissante).
 */
export function partsDesVentes(
  ventes: readonly VentePourCalcul[],
  references: ReadonlyMap<string, number>,
): Map<string, { prixVendu: number; emballage: number; venteId: string }> {
  const resultat = new Map<string, { prixVendu: number; emballage: number; venteId: string }>();
  for (const vente of ventes) {
    if (vente.annulee) continue;
    const lignes = vente.lignes
      .filter((l) => !l.retourne)
      .sort(
        (a, b) =>
          (references.get(a.articleId) ?? 0) - (references.get(b.articleId) ?? 0) ||
          a.articleId.localeCompare(b.articleId),
      );
    const prix = repartir(
      vente.montantCredite,
      lignes.map((l) => l.prixAffiche),
    );
    const emballages = repartir(
      vente.emballage,
      lignes.map(() => 1),
    );
    lignes.forEach((l, i) =>
      resultat.set(l.articleId, { prixVendu: prix[i] ?? 0, emballage: emballages[i] ?? 0, venteId: vente.id }),
    );
  }
  return resultat;
}

/** Calcule le détail de chaque article (§6.5). */
export function calculerDetails(d: DonneesCalcul): Map<string, DetailArticle> {
  const prixAchat = prixAchatParArticle(d.articles, d.lots);
  const essence = essenceParArticle(d.articles, d.sorties);
  const ventes = partsDesVentes(d.ventes, new Map(d.articles.map((a) => [a.id, a.reference])));
  const boosts = new Map<string, number>();
  for (const b of d.boosts) boosts.set(b.articleId, (boosts.get(b.articleId) ?? 0) + b.montant);

  const resultat = new Map<string, DetailArticle>();
  for (const a of d.articles) {
    const vente = ventes.get(a.id);
    const enSortieStock = a.statut === "sortie_stock";
    // Articles sortis du stock : pas d'emballage (§6.3).
    const emballage = enSortieStock ? 0 : (vente?.emballage ?? 0);
    const detail = {
      prixAchat: prixAchat.get(a.id) ?? 0,
      essence: essence.get(a.id) ?? 0,
      emballage,
      boosts: boosts.get(a.id) ?? 0,
    };
    const coutTotal = detail.prixAchat + detail.essence + detail.emballage + detail.boosts;
    let benefice = -coutTotal;
    let realise = false;
    if (a.statut === "finalise") {
      benefice = (vente?.prixVendu ?? 0) - coutTotal;
      realise = true;
    } else if (enSortieStock) {
      benefice = (a.motifSortie === "revendu" ? (a.prixRevente ?? 0) : 0) - coutTotal;
      realise = true;
    }
    resultat.set(a.id, {
      ...detail,
      coutTotal,
      prixVendu: enSortieStock ? null : (vente?.prixVendu ?? null),
      venteId: enSortieStock ? null : (vente?.venteId ?? null),
      benefice,
      realise,
    });
  }
  return resultat;
}
