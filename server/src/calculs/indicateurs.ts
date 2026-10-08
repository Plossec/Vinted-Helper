// Indicateurs du tableau de bord — cahier des charges §5.9 et §6.6.
// Fonctions pures : elles reçoivent les données et le détail de chaque article (calculerDetails) ; aucune part
// n'est stockée. Les mois sont ceux de l'heure de Paris.
import type { DetailArticle, DonneesCalcul, VentePourCalcul } from "./benefice.js";
import { essenceSortiesVides } from "./couts.js";

export interface ArticlePourIndicateurs {
  id: string;
  statut: string;
  /** AAAA-MM-JJ. */
  dateAchat: string | null;
  /** Centimes. */
  prixAffiche: number | null;
  sortieId: string | null;
  lieuId: string | null;
  /** Lieu « Maison » : affiché à part dans la rentabilité (§5.9). */
  estMaison: boolean;
  categorie: string | null;
  marque: string | null;
  gamme: string | null;
  /** Dates (ISO) des passages En ligne. */
  misesEnLigne: readonly string[];
  /** ISO. */
  dateSortieStock: string | null;
}

export interface DonneesIndicateurs {
  calcul: DonneesCalcul;
  articles: readonly ArticlePourIndicateurs[];
  /** Date (AAAA-MM-JJ) de chaque sortie. */
  datesSorties: ReadonlyMap<string, string>;
  /** Dates (ISO) de chaque vente. */
  datesVentes: ReadonlyMap<string, { vente: string; envoi: string | null; finalisation: string | null }>;
  /** Boosts datés (AAAA-MM-JJ), pour la trésorerie. */
  boosts: readonly { montant: number; date: string }[];
  frais: readonly { date: string; montant: number }[];
}

const JOUR_PARIS = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jour (AAAA-MM-JJ, heure de Paris) d'un horodatage ISO, ou date déjà au format AAAA-MM-JJ. */
export function jourParis(dateOuIso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOuIso) ? dateOuIso : JOUR_PARIS.format(new Date(dateOuIso));
}

/** Mois (AAAA-MM, heure de Paris). */
export const moisParis = (dateOuIso: string) => jourParis(dateOuIso).slice(0, 7);

/** Nombre de jours entre deux jours calendaires (AAAA-MM-JJ). */
function ecartJours(debut: string, fin: string): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000);
}

export interface Periode {
  /** Centimes. */
  chiffreAffaires: number;
  beneficeRealise: number;
  tresorerie: number;
  /** Frais divers + essence des sorties sans article. */
  fraisGeneraux: number;
}

const periodeVide = (): Periode => ({ chiffreAffaires: 0, beneficeRealise: 0, tresorerie: 0, fraisGeneraux: 0 });

/** Vente active (non annulée) de chaque article non renvoyé. */
function venteParArticle(ventes: readonly VentePourCalcul[]) {
  const resultat = new Map<string, VentePourCalcul>();
  for (const v of ventes) {
    if (v.annulee) continue;
    for (const l of v.lignes) if (!l.retourne) resultat.set(l.articleId, v);
  }
  return resultat;
}

/** Postes de la trésorerie d'un mois (centimes, tous positifs) : trésorerie = encaissé − toutes les dépenses. */
export interface PostesTresorerie {
  /** Crédits Vinted (date de finalisation) + reventes hors Vinted (date de sortie du stock). */
  encaisse: number;
  achats: number;
  essence: number;
  emballages: number;
  boosts: number;
  fraisDivers: number;
}

const postesVides = (): PostesTresorerie => ({
  encaisse: 0,
  achats: 0,
  essence: 0,
  emballages: 0,
  boosts: 0,
  fraisDivers: 0,
});

/**
 * CA, bénéfice réalisé, trésorerie et frais généraux de chaque mois (§6.6), indexés par « AAAA-MM », avec le détail
 * de la trésorerie (issue #88 : affiché sous la tuile).
 * - CA : prix vendus des articles finalisés (date de finalisation) + reventes hors Vinted (date de sortie du stock).
 * - Bénéfice réalisé : bénéfices des articles finalisés / sortis du stock du mois − frais généraux du mois.
 * - Trésorerie : + crédits (finalisation) + reventes − achats (date d'achat) − essence (date de sortie)
 *   − emballages (date d'envoi) − boosts (date du boost) − frais divers. Elle est la somme de ses postes.
 */
export function indicateursEtTresorerieParMois(d: DonneesIndicateurs, details: ReadonlyMap<string, DetailArticle>) {
  const mois = new Map<string, Periode>();
  const postes = new Map<string, PostesTresorerie>();
  const de = (cle: string) => {
    let p = mois.get(cle);
    if (!p) mois.set(cle, (p = periodeVide()));
    return p;
  };
  const tr = (cle: string) => {
    de(cle);
    let t = postes.get(cle);
    if (!t) postes.set(cle, (t = postesVides()));
    return t;
  };
  const ventes = venteParArticle(d.calcul.ventes);
  const sorties = new Map(d.calcul.articles.map((a) => [a.id, a]));

  for (const a of d.articles) {
    const detail = details.get(a.id);
    if (!detail) continue;
    if (a.dateAchat) tr(moisParis(a.dateAchat)).achats += detail.prixAchat;
    if (a.statut === "finalise") {
      const v = ventes.get(a.id);
      const date = v ? d.datesVentes.get(v.id)?.finalisation : null;
      if (date) {
        const p = de(moisParis(date));
        p.chiffreAffaires += detail.prixVendu ?? 0;
        p.beneficeRealise += detail.benefice;
      }
    } else if (a.statut === "sortie_stock" && a.dateSortieStock) {
      const cle = moisParis(a.dateSortieStock);
      const p = de(cle);
      const calcul = sorties.get(a.id);
      if (calcul?.motifSortie === "revendu") {
        p.chiffreAffaires += calcul.prixRevente ?? 0;
        tr(cle).encaisse += calcul.prixRevente ?? 0;
      }
      p.beneficeRealise += detail.benefice;
    }
  }

  for (const v of d.calcul.ventes) {
    if (v.annulee || v.lignes.every((l) => l.retourne)) continue;
    const dates = d.datesVentes.get(v.id);
    if (dates?.finalisation) tr(moisParis(dates.finalisation)).encaisse += v.montantCredite;
    if (dates?.envoi) tr(moisParis(dates.envoi)).emballages += v.emballage;
  }

  for (const s of d.calcul.sorties) {
    const date = d.datesSorties.get(s.id);
    if (date) tr(moisParis(date)).essence += s.montantEssence;
  }
  for (const [sortieId, montant] of essenceSortiesVides(d.calcul.articles, d.calcul.sorties)) {
    const date = d.datesSorties.get(sortieId);
    if (!date) continue;
    const p = de(moisParis(date));
    p.fraisGeneraux += montant;
    p.beneficeRealise -= montant;
  }

  for (const b of d.boosts) tr(moisParis(b.date)).boosts += b.montant;

  for (const f of d.frais) {
    const p = de(moisParis(f.date));
    p.fraisGeneraux += f.montant;
    p.beneficeRealise -= f.montant;
    tr(moisParis(f.date)).fraisDivers += f.montant;
  }

  for (const [cle, t] of postes) {
    de(cle).tresorerie = t.encaisse - t.achats - t.essence - t.emballages - t.boosts - t.fraisDivers;
  }
  return { mois, postes };
}

/** CA, bénéfice réalisé, trésorerie et frais généraux de chaque mois (§6.6), indexés par « AAAA-MM ». */
export function indicateursParMois(d: DonneesIndicateurs, details: ReadonlyMap<string, DetailArticle>) {
  return indicateursEtTresorerieParMois(d, details).mois;
}

/**
 * Coût total, prix affiché et nombre d'articles de chaque statut (issue #88 : tableau du stock par statut). Le
 * prix affiché manquant compte pour 0.
 */
export function stockParStatut(d: DonneesIndicateurs, details: ReadonlyMap<string, DetailArticle>) {
  const resultat: Record<string, { nombre: number; coutTotal: number; prixAffiche: number }> = {};
  for (const a of d.articles) {
    const ligne = (resultat[a.statut] ??= { nombre: 0, coutTotal: 0, prixAffiche: 0 });
    ligne.nombre += 1;
    ligne.coutTotal += details.get(a.id)?.coutTotal ?? 0;
    ligne.prixAffiche += a.prixAffiche ?? 0;
  }
  return resultat;
}

export interface EnCours {
  /** Centimes : prix vendus des ventes pas encore finalisées. */
  chiffreAffaires: number;
  /** Centimes : bénéfices attendus de ces articles (prix vendu − coût total). */
  benefice: number;
}

/**
 * Ventes en cours de chaque mois (issue #85), indexées par « AAAA-MM » de la **date de vente** : articles À expédier
 * ou Envoyé d'une vente non annulée, non renvoyés. CA et bénéfice théoriques = réalisés + en cours.
 */
export function ventesEnCoursParMois(d: DonneesIndicateurs, details: ReadonlyMap<string, DetailArticle>) {
  const mois = new Map<string, EnCours>();
  const ventes = venteParArticle(d.calcul.ventes);
  for (const a of d.articles) {
    if (a.statut !== "a_expedier" && a.statut !== "envoye") continue;
    const detail = details.get(a.id);
    const v = ventes.get(a.id);
    const date = v ? d.datesVentes.get(v.id)?.vente : null;
    if (!detail || detail.prixVendu === null || !date) continue;
    const cle = moisParis(date);
    const p = mois.get(cle) ?? { chiffreAffaires: 0, benefice: 0 };
    p.chiffreAffaires += detail.prixVendu;
    // Le bénéfice provisoire (§6.5) vaut −coût total tant que la vente n'est pas finalisée : ici, on compte le prix
    // vendu attendu.
    p.benefice += detail.prixVendu - detail.coutTotal;
    mois.set(cle, p);
  }
  return mois;
}

/** Somme des ventes en cours de plusieurs mois (mois sans vente en cours : `undefined`). */
export function cumulerEnCours(periodes: readonly (EnCours | undefined)[]): EnCours {
  return periodes.reduce<EnCours>(
    (t, p) => ({
      chiffreAffaires: t.chiffreAffaires + (p?.chiffreAffaires ?? 0),
      benefice: t.benefice + (p?.benefice ?? 0),
    }),
    { chiffreAffaires: 0, benefice: 0 },
  );
}

/** CA et bénéfice théoriques (issue #85) : réalisés (frais généraux déduits) + ventes en cours. */
export function theorique(p: Periode, e: EnCours): EnCours {
  return { chiffreAffaires: p.chiffreAffaires + e.chiffreAffaires, benefice: p.beneficeRealise + e.benefice };
}

/**
 * Théorique de chaque mesure du graphique (issue #88) : CA et bénéfice comme `theorique` ; trésorerie + crédits
 * attendus des ventes en cours (= CA en cours).
 */
export function theoriqueDesMesures(p: Periode, e: EnCours) {
  return {
    chiffreAffaires: p.chiffreAffaires + e.chiffreAffaires,
    beneficeRealise: p.beneficeRealise + e.benefice,
    tresorerie: p.tresorerie + e.chiffreAffaires,
  };
}

/** Somme de plusieurs périodes (ex. les 12 mois d'une année). */
export function cumuler(periodes: readonly Periode[]): Periode {
  return periodes.reduce(
    (t, p) => ({
      chiffreAffaires: t.chiffreAffaires + p.chiffreAffaires,
      beneficeRealise: t.beneficeRealise + p.beneficeRealise,
      tresorerie: t.tresorerie + p.tresorerie,
      fraisGeneraux: t.fraisGeneraux + p.fraisGeneraux,
    }),
    periodeVide(),
  );
}

const EN_STOCK = (statut: string) => statut !== "finalise" && statut !== "sortie_stock";

/** Valeur du stock (§6.6) : articles ni finalisés ni sortis du stock, au coût total et au prix affiché. */
export function valeurStock(d: DonneesIndicateurs, details: ReadonlyMap<string, DetailArticle>) {
  const parStatut: Record<string, number> = {};
  let coutTotal = 0;
  let prixAffiche = 0;
  for (const a of d.articles) {
    parStatut[a.statut] = (parStatut[a.statut] ?? 0) + 1;
    if (!EN_STOCK(a.statut)) continue;
    coutTotal += details.get(a.id)?.coutTotal ?? 0;
    prixAffiche += a.prixAffiche ?? 0;
  }
  return { coutTotal, prixAffiche, parStatut };
}

export interface Rentabilite {
  cle: string;
  /** Bénéfices des articles finalisés ou sortis du stock. */
  realise: number;
  /** Réalisé − coûts totaux des articles encore en stock. */
  provisoire: number;
  nombreArticles: number;
  restants: number;
}

/**
 * Rentabilité par sortie ou par lieu (§5.9, §6.6). Les articles Maison sont regroupés à part (`maison`),
 * hors classement ; le classement est trié par bénéfice provisoire décroissant.
 */
export function rentabilite(
  d: DonneesIndicateurs,
  details: ReadonlyMap<string, DetailArticle>,
  par: "sortie" | "lieu",
): { classement: Rentabilite[]; maison: Rentabilite | null } {
  const groupes = new Map<string, Rentabilite>();
  let maison: Rentabilite | null = null;
  for (const a of d.articles) {
    const detail = details.get(a.id);
    if (!detail) continue;
    const cle = a.estMaison ? "maison" : par === "sortie" ? a.sortieId : a.lieuId;
    if (cle === null) continue;
    let g: Rentabilite | null | undefined = cle === "maison" ? maison : groupes.get(cle);
    if (!g) {
      g = { cle, realise: 0, provisoire: 0, nombreArticles: 0, restants: 0 };
      if (cle === "maison") maison = g;
      else groupes.set(cle, g);
    }
    g.nombreArticles += 1;
    if (detail.realise) {
      g.realise += detail.benefice;
      g.provisoire += detail.benefice;
    } else {
      g.provisoire -= detail.coutTotal;
      g.restants += 1;
    }
  }
  return { classement: [...groupes.values()].sort((a, b) => b.provisoire - a.provisoire), maison };
}

export interface Analyse {
  cle: string;
  nombreVendus: number;
  /** Centimes : moyenne des bénéfices des articles finalisés, arrondie au centime inférieur. */
  margeMoyenne: number;
  /** Σ bénéfices / Σ coûts totaux ; null si Σ coûts = 0 (affiché « — »). */
  tauxMarge: number | null;
  /** Jours (moyenne) : mise en ligne → vente et achat → vente. */
  delaiMiseEnLigneVente: number | null;
  delaiAchatVente: number | null;
}

/** Délais de vente d'un article finalisé (§6.6) : mise en ligne → vente et achat → vente, en jours. */
export function delaisVente(a: ArticlePourIndicateurs, dateVente: string) {
  const jourVente = jourParis(dateVente);
  const misesAvant = a.misesEnLigne
    .map(jourParis)
    .filter((j) => j <= jourVente)
    .sort();
  const derniere = misesAvant[misesAvant.length - 1];
  return {
    miseEnLigne: derniere ? ecartJours(derniere, jourVente) : null,
    achat: a.dateAchat ? ecartJours(a.dateAchat, jourVente) : null,
  };
}

const moyenne = (valeurs: number[]) =>
  valeurs.length === 0 ? null : valeurs.reduce((s, v) => s + v, 0) / valeurs.length;

/**
 * Analyse par catégorie, marque ou gamme (§5.9) sur les articles finalisés : marge moyenne en € et en %,
 * délais moyens de vente. Catégorie : regroupée au `niveau` voulu de l'arbre (1 = Femmes / Hommes…).
 */
export function analyser(
  d: DonneesIndicateurs,
  details: ReadonlyMap<string, DetailArticle>,
  par: "categorie" | "marque" | "gamme",
  niveau = 3,
): Analyse[] {
  const ventes = venteParArticle(d.calcul.ventes);
  const groupes = new Map<
    string,
    { benefices: number[]; couts: number; delaisLigne: number[]; delaisAchat: number[] }
  >();
  for (const a of d.articles) {
    if (a.statut !== "finalise") continue;
    const detail = details.get(a.id);
    if (!detail) continue;
    const brut = par === "categorie" ? a.categorie?.split("/").slice(0, niveau).join("/") : a[par]?.trim();
    const cle = brut || "(non renseigné)";
    let g = groupes.get(cle);
    if (!g) groupes.set(cle, (g = { benefices: [], couts: 0, delaisLigne: [], delaisAchat: [] }));
    g.benefices.push(detail.benefice);
    g.couts += detail.coutTotal;
    const v = ventes.get(a.id);
    const dateVente = v ? d.datesVentes.get(v.id)?.vente : null;
    if (dateVente) {
      const delais = delaisVente(a, dateVente);
      if (delais.miseEnLigne !== null) g.delaisLigne.push(delais.miseEnLigne);
      if (delais.achat !== null) g.delaisAchat.push(delais.achat);
    }
  }
  return [...groupes].map(([cle, g]) => {
    const somme = g.benefices.reduce((s, b) => s + b, 0);
    return {
      cle,
      nombreVendus: g.benefices.length,
      margeMoyenne: Math.floor(somme / g.benefices.length),
      tauxMarge: g.couts === 0 ? null : somme / g.couts,
      delaiMiseEnLigneVente: moyenne(g.delaisLigne),
      delaiAchatVente: moyenne(g.delaisAchat),
    };
  });
}
