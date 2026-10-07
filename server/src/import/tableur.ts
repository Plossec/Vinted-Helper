// Import de l'ancien tableur de suivi (décision du 07/10/2026) : sorties, achats (articles seuls ou lots), mises en
// ligne et ventes, enregistrés par les fonctions de l'application (références, historiques, calculs cohérents).
// Le fichier d'import (JSON) est préparé à partir du tableur ; il contient des données personnelles et n'est jamais
// versionné. Aucun calcul d'argent ici : les parts (lots, essence, ventes groupées) sont calculées par l'application.
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { creerAchat } from "../achats/service.js";
import { changerStatut } from "../articles/service.js";
import type { Base } from "../base/connexion.js";
import { article } from "../base/schema.js";
import { erreurSaisie } from "../outils/erreurs.js";
import { ajouterValeur } from "../referentiels/service.js";
import { creerSortie } from "../sorties/service.js";
import { avancerVente, creerVente } from "../ventes/service.js";

export interface SortieImport {
  cle: string;
  date: string;
  lieu: string;
  /** Centimes. */
  essence: number;
}

export interface AchatImport {
  /** Clé de la sortie, ou null pour un article Maison. */
  sortie: string | null;
  date: string;
  /** Centimes : prix de l'article seul ou prix total du lot (plusieurs articles). */
  prixTotal: number;
  /** Clés des articles achetés ensemble. */
  articles: number[];
}

export interface ArticleImport {
  cle: number;
  nom: string;
  gamme: string | null;
  marque: string | null;
  lieu: string;
  dateAchat: string;
  /** Mise en ligne : date et prix affiché (centimes). */
  enLigne?: { date: string; prixAffiche: number };
  /** Prix estimé d'un article jamais mis en ligne (centimes), gardé dans les notes. */
  prixEstime?: number;
}

export interface VenteImport {
  articles: number[];
  /** Centimes. */
  montant: number;
  emballage: number;
  date: string;
  /** Envoyé (colis à finaliser plus tard dans l'application) ou Finalisé. */
  statutFinal: "envoye" | "finalise";
}

export interface DonneesImport {
  source: string;
  sorties: SortieImport[];
  achats: AchatImport[];
  articles: ArticleImport[];
  ventes: VenteImport[];
}

/** Nombres d'éléments créés (les montants se vérifient ensuite dans le tableau de bord de l'application). */
export interface BilanImport {
  articles: number;
  sorties: number;
  lots: number;
  ventes: number;
  enLigne: number;
  brouillons: number;
}

export const PREFIXE_NOTE = "Importé du tableur";

// --- Lecture et contrôle du fichier -------------------------------------------------------------------------------

type Objet = Record<string, unknown>;

function objet(v: unknown, ou: string): Objet {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw erreurSaisie(`${ou} : objet attendu.`);
  return v as Objet;
}
function liste(v: unknown, ou: string): unknown[] {
  if (!Array.isArray(v)) throw erreurSaisie(`${ou} : liste attendue.`);
  return v;
}
function texte(v: unknown, ou: string): string {
  if (typeof v !== "string" || v.trim() === "") throw erreurSaisie(`${ou} : texte attendu.`);
  return v.trim();
}
function texteOuNull(v: unknown, ou: string): string | null {
  return v === null || v === undefined ? null : texte(v, ou);
}
function centimes(v: unknown, ou: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) throw erreurSaisie(`${ou} : centimes attendus.`);
  return v;
}
function entier(v: unknown, ou: string): number {
  if (typeof v !== "number" || !Number.isInteger(v)) throw erreurSaisie(`${ou} : nombre entier attendu.`);
  return v;
}
function jour(v: unknown, ou: string): string {
  const t = texte(v, ou);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw erreurSaisie(`${ou} : date AAAA-MM-JJ attendue.`);
  return t;
}

/** Contrôle complet du fichier avant toute écriture. */
export function lireDonneesImport(brut: unknown): DonneesImport {
  const d = objet(brut, "Fichier");
  const sorties = liste(d.sorties, "sorties").map((s, i) => {
    const o = objet(s, `sorties[${i}]`);
    return {
      cle: texte(o.cle, `sorties[${i}].cle`),
      date: jour(o.date, `sorties[${i}].date`),
      lieu: texte(o.lieu, `sorties[${i}].lieu`),
      essence: centimes(o.essence, `sorties[${i}].essence`),
    };
  });
  const articles = liste(d.articles, "articles").map((a, i): ArticleImport => {
    const o = objet(a, `articles[${i}]`);
    const lu: ArticleImport = {
      cle: entier(o.cle, `articles[${i}].cle`),
      nom: texte(o.nom, `articles[${i}].nom`),
      gamme: texteOuNull(o.gamme, `articles[${i}].gamme`),
      marque: texteOuNull(o.marque, `articles[${i}].marque`),
      lieu: texte(o.lieu, `articles[${i}].lieu`),
      dateAchat: jour(o.dateAchat, `articles[${i}].dateAchat`),
    };
    if (o.enLigne !== undefined) {
      const e = objet(o.enLigne, `articles[${i}].enLigne`);
      lu.enLigne = {
        date: jour(e.date, `articles[${i}].enLigne.date`),
        prixAffiche: centimes(e.prixAffiche, `articles[${i}].enLigne.prixAffiche`),
      };
    }
    if (o.prixEstime !== undefined) lu.prixEstime = centimes(o.prixEstime, `articles[${i}].prixEstime`);
    return lu;
  });
  const achats = liste(d.achats, "achats").map((a, i) => {
    const o = objet(a, `achats[${i}]`);
    return {
      sortie: texteOuNull(o.sortie, `achats[${i}].sortie`),
      date: jour(o.date, `achats[${i}].date`),
      prixTotal: centimes(o.prixTotal, `achats[${i}].prixTotal`),
      articles: liste(o.articles, `achats[${i}].articles`).map((c, j) => entier(c, `achats[${i}].articles[${j}]`)),
    };
  });
  const ventes = liste(d.ventes, "ventes").map((v, i): VenteImport => {
    const o = objet(v, `ventes[${i}]`);
    if (o.statutFinal !== "envoye" && o.statutFinal !== "finalise") {
      throw erreurSaisie(`ventes[${i}].statutFinal : « envoye » ou « finalise » attendu.`);
    }
    return {
      articles: liste(o.articles, `ventes[${i}].articles`).map((c, j) => entier(c, `ventes[${i}].articles[${j}]`)),
      montant: centimes(o.montant, `ventes[${i}].montant`),
      emballage: centimes(o.emballage, `ventes[${i}].emballage`),
      date: jour(o.date, `ventes[${i}].date`),
      statutFinal: o.statutFinal,
    };
  });
  const donnees = { source: texte(d.source, "source"), sorties, achats, articles, ventes };
  verifierCoherence(donnees);
  return donnees;
}

function verifierCoherence(d: DonneesImport) {
  const cles = new Set(d.articles.map((a) => a.cle));
  if (cles.size !== d.articles.length) throw erreurSaisie("Clé d'article en double.");
  const sorties = new Set(d.sorties.map((s) => s.cle));
  const achetes = d.achats.flatMap((a) => a.articles);
  if (achetes.length !== cles.size || new Set(achetes).size !== cles.size || !achetes.every((c) => cles.has(c))) {
    throw erreurSaisie("Chaque article doit appartenir à un et un seul achat.");
  }
  for (const a of d.achats) {
    if (a.articles.length === 0) throw erreurSaisie("Achat sans article.");
    if (a.sortie !== null && !sorties.has(a.sortie)) throw erreurSaisie(`Sortie inconnue : ${a.sortie}.`);
    if (a.sortie === null && a.articles.length > 1) throw erreurSaisie("Un lot doit appartenir à une sortie.");
  }
  const parCle = new Map(d.articles.map((a) => [a.cle, a]));
  const vendus = d.ventes.flatMap((v) => v.articles);
  if (new Set(vendus).size !== vendus.length) throw erreurSaisie("Article vendu deux fois.");
  for (const v of d.ventes) {
    for (const c of v.articles) {
      const a = parCle.get(c);
      if (!a?.enLigne) throw erreurSaisie(`Article ${c} vendu sans mise en ligne.`);
      if (v.date < a.enLigne.date) throw erreurSaisie(`« ${a.nom} » : vente avant la mise en ligne.`);
    }
  }
  for (const a of d.articles) {
    if (a.enLigne && a.enLigne.date < a.dateAchat) throw erreurSaisie(`« ${a.nom} » : mise en ligne avant l'achat.`);
  }
}

// --- Import ---------------------------------------------------------------------------------------------------------

/** Instant d'un évènement du tableur : 8 h (heure de Paris en été) + quelques minutes pour garder l'ordre du jour. */
const instant = (jourIso: string, minutes: number) =>
  new Date(`${jourIso}T06:${String(minutes).padStart(2, "0")}:00.000Z`);

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Le tableur a-t-il déjà été importé pour cet utilisateur ? */
export async function dejaImporte(base: Base, utilisateurId: string): Promise<boolean> {
  const [trouve] = await base
    .select({ id: article.id })
    .from(article)
    .where(and(eq(article.utilisateurId, utilisateurId), like(article.notes, `${PREFIXE_NOTE}%`)))
    .limit(1);
  return trouve !== undefined;
}

/**
 * Importe le tableur. À appeler dans une transaction (`base` peut être une transaction) : en cas d'erreur, rien
 * n'est enregistré. `maintenant` : date du jour (les dates du tableur ne peuvent pas être dans le futur).
 */
export async function importerTableur(
  base: Base,
  utilisateurId: string,
  d: DonneesImport,
  maintenant: Date,
): Promise<BilanImport> {
  if (await dejaImporte(base, utilisateurId)) throw erreurSaisie("Ce tableur a déjà été importé.");
  const note = `${PREFIXE_NOTE} « ${d.source} » le ${maintenant.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.`;

  const lieux = new Map<string, string>();
  const idLieu = async (nom: string) => {
    let id = lieux.get(nom);
    if (id === undefined) {
      const l = await ajouterValeur(base, utilisateurId, "lieux", nom);
      if (!l) throw new Error(`Lieu « ${nom} » impossible à créer.`);
      id = l.id;
      lieux.set(nom, id);
    }
    return id;
  };
  const marques = new Map<string, string>();
  const idMarque = async (nom: string) => {
    let id = marques.get(nom);
    if (id === undefined) {
      const m = await ajouterValeur(base, utilisateurId, "marques", nom);
      if (!m) throw new Error(`Marque « ${nom} » impossible à créer.`);
      id = m.id;
      marques.set(nom, id);
    }
    return id;
  };

  const sorties = new Map<string, string>();
  for (const s of d.sorties) {
    const id = randomUUID();
    await creerSortie(
      base,
      utilisateurId,
      id,
      { date: s.date, lieuId: await idLieu(s.lieu), notes: note },
      s.essence,
      instant(s.date, 0),
    );
    sorties.set(s.cle, id);
  }

  const parCle = new Map(d.articles.map((a) => [a.cle, a]));
  const ids = new Map<number, string>();
  for (const achat of d.achats) {
    const articleIds = achat.articles.map(() => randomUUID());
    const sortieId = achat.sortie === null ? null : (sorties.get(achat.sortie) ?? null);
    await creerAchat(
      base,
      utilisateurId,
      { id: randomUUID(), articleIds, sortieId, prixTotal: achat.prixTotal, photoId: null, date: achat.date },
      instant(achat.date, 0),
    );
    for (const [i, cle] of achat.articles.entries()) {
      const a = parCle.get(cle);
      const id = articleIds[i];
      if (!a || !id) throw new Error("Article introuvable.");
      ids.set(cle, id);
      const notes = a.prixEstime === undefined ? note : `${note} Prix estimé : ${euros.format(a.prixEstime / 100)}.`;
      await base
        .update(article)
        .set({
          nom: a.nom,
          gamme: a.gamme,
          marqueId: a.marque === null ? null : await idMarque(a.marque),
          notes,
          // Article Maison : lieu « Maison » (creerAchat) ; sinon lieu de la sortie.
        })
        .where(eq(article.id, id));
    }
  }

  for (const a of d.articles) {
    const id = ids.get(a.cle);
    if (!a.enLigne || !id) continue;
    await changerStatut(
      base,
      utilisateurId,
      id,
      { vers: "en_ligne", date: instant(a.enLigne.date, 1), prixAffiche: a.enLigne.prixAffiche },
      maintenant,
    );
  }

  for (const v of d.ventes) {
    const articleIds = v.articles.map((c) => ids.get(c) ?? "");
    const venteId = await creerVente(
      base,
      utilisateurId,
      { articleIds, montantCredite: v.montant, emballage: v.emballage, dateVente: instant(v.date, 2) },
      maintenant,
    );
    await avancerVente(base, utilisateurId, venteId, "envoye", instant(v.date, 3), maintenant);
    if (v.statutFinal === "finalise") {
      await avancerVente(base, utilisateurId, venteId, "finalise", instant(v.date, 4), maintenant);
    }
  }

  const vendus = new Set(d.ventes.flatMap((v) => v.articles));
  return {
    articles: ids.size,
    sorties: sorties.size,
    lots: d.achats.filter((a) => a.articles.length > 1).length,
    ventes: d.ventes.length,
    enLigne: d.articles.filter((a) => a.enLigne && !vendus.has(a.cle)).length,
    brouillons: d.articles.filter((a) => !a.enLigne).length,
  };
}
