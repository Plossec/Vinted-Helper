// Alertes affichées dans l'application (§5.8) : brouillon trop ancien, article dormant, articles à expédier,
// retours à récupérer, publications Vinted en erreur (#72).
// Fonction pure : la date « maintenant » est passée en paramètre ; les jours sont ceux de l'heure de Paris.
import { jourParis } from "../calculs/indicateurs.js";

export interface ArticlePourAlertes {
  id: string;
  reference: number;
  nom: string | null;
  statut: string;
  /** Changements de statut (ISO), dans n'importe quel ordre. */
  historique: readonly { vers: string; date: string }[];
  /** Prix affichés successifs (ISO). */
  historiquePrix: readonly { prix: number; date: string }[];
}

export interface Alerte {
  id: string;
  reference: number;
  nom: string | null;
  /** Jour de départ du décompte (AAAA-MM-JJ). */
  depuis: string;
  jours: number;
}

const ecartJours = (debut: string, fin: string) =>
  Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000);

const parDate = <T extends { date: string }>(liste: readonly T[]) =>
  [...liste].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

/** Dernière date d'arrivée dans le statut actuel. */
function arriveeDansStatut(a: ArticlePourAlertes): string | null {
  const entrees = parDate(a.historique).filter((h) => h.vers === a.statut);
  return entrees[entrees.length - 1]?.date ?? null;
}

/**
 * Point de départ « dormant » (§5.8) : la dernière baisse de prix depuis la mise en ligne,
 * ou la mise en ligne s'il n'y a pas eu de baisse.
 */
export function departDormant(a: ArticlePourAlertes): string | null {
  const miseEnLigne = arriveeDansStatut(a);
  if (miseEnLigne === null) return null;
  let depart = miseEnLigne;
  const prix = parDate(a.historiquePrix);
  for (let i = 1; i < prix.length; i++) {
    const avant = prix[i - 1];
    const courant = prix[i];
    if (!avant || !courant) continue;
    if (courant.prix < avant.prix && Date.parse(courant.date) >= Date.parse(miseEnLigne)) depart = courant.date;
  }
  return depart;
}

export function calculerAlertes(
  articles: readonly ArticlePourAlertes[],
  delais: { delaiBrouillon: number; delaiDormant: number },
  maintenant: Date,
) {
  const aujourdhui = jourParis(maintenant.toISOString());
  const alerte = (a: ArticlePourAlertes, date: string): Alerte => {
    const depuis = jourParis(date);
    return { id: a.id, reference: a.reference, nom: a.nom, depuis, jours: ecartJours(depuis, aujourdhui) };
  };
  const brouillons: Alerte[] = [];
  const dormants: Alerte[] = [];
  const aExpedier: Alerte[] = [];
  const aRecuperer: Alerte[] = [];
  const erreursPublication: Alerte[] = [];
  for (const a of articles) {
    if (a.statut === "brouillon") {
      const date = arriveeDansStatut(a);
      if (date) {
        const al = alerte(a, date);
        if (al.jours >= delais.delaiBrouillon) brouillons.push(al);
      }
    } else if (a.statut === "en_ligne") {
      const date = departDormant(a);
      if (date) {
        const al = alerte(a, date);
        if (al.jours >= delais.delaiDormant) dormants.push(al);
      }
    } else if (a.statut === "a_expedier" || a.statut === "a_recuperer" || a.statut === "erreur_publication") {
      const date = arriveeDansStatut(a);
      const groupe =
        a.statut === "a_expedier" ? aExpedier : a.statut === "a_recuperer" ? aRecuperer : erreursPublication;
      if (date) groupe.push(alerte(a, date));
    }
  }
  const plusAnciens = (x: Alerte, y: Alerte) => y.jours - x.jours || x.reference - y.reference;
  return {
    brouillons: brouillons.sort(plusAnciens),
    dormants: dormants.sort(plusAnciens),
    aExpedier: aExpedier.sort(plusAnciens),
    /** Retours à aller chercher (issue #52). */
    aRecuperer: aRecuperer.sort(plusAnciens),
    /** Publications Vinted en échec, à redemander ou à remettre À publier (issue #72). */
    erreursPublication: erreursPublication.sort(plusAnciens),
  };
}

/** Groupes « Pour info » de l'écran « À faire » qu'on peut marquer « Vu » (#191). */
export const GROUPES_VU = ["brouillons", "dormants"] as const;
export type GroupeVu = (typeof GROUPES_VU)[number];

export interface SignalementVu {
  type: string;
  articleId: string;
  /** Date de départ de l'alerte au moment du « Vu » (AAAA-MM-JJ). */
  depuis: string;
}

/**
 * Retire les alertes « Pour info » marquées « Vu » (#191). Un « Vu » ne vaut que pour la même date de départ :
 * l'article redevenu dormant après une baisse de prix (ou revenu en Brouillon) réapparaît.
 */
export function masquerVus<T extends Record<GroupeVu, readonly Alerte[]>>(
  alertes: T,
  vus: readonly SignalementVu[],
): T {
  const cle = (type: string, articleId: string, depuis: string) => `${type}|${articleId}|${depuis}`;
  const masques = new Set(vus.map((v) => cle(v.type, v.articleId, v.depuis)));
  const resultat = { ...alertes };
  for (const type of GROUPES_VU) {
    resultat[type] = alertes[type].filter((a) => !masques.has(cle(type, a.id, a.depuis))) as T[GroupeVu];
  }
  return resultat;
}
