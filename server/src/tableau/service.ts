// Tableau de bord (§5.9) : lecture des données puis appel du module de calcul (aucun calcul d'argent ici).
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { article, boost, fraisGeneral, historiqueStatut, lieu, marque, sortie, vente } from "../base/schema.js";
import { CATEGORIES } from "../catalogue/categories.js";
import { calculerDetails } from "../calculs/benefice.js";
import {
  analyser,
  cumuler,
  type DonneesIndicateurs,
  indicateursParMois,
  type Periode,
  rentabilite,
  valeurStock,
} from "../calculs/indicateurs.js";
import { chargerDonneesCalcul } from "../couts/service.js";

async function chargerDonnees(base: Base, utilisateurId: string): Promise<DonneesIndicateurs> {
  const calcul = await chargerDonneesCalcul(base, utilisateurId);
  const ids = calcul.articles.map((a) => a.id);
  const [articles, misesEnLigne, sorties, ventes, boosts, frais] = await Promise.all([
    base
      .select({
        id: article.id,
        statut: article.statut,
        dateAchat: article.dateAchat,
        prixAffiche: article.prixAffiche,
        sortieId: article.sortieId,
        lieuId: article.lieuId,
        estMaison: lieu.estMaison,
        categorie: article.categorie,
        marque: marque.nom,
        gamme: article.gamme,
        dateSortieStock: article.dateSortieStock,
      })
      .from(article)
      .leftJoin(lieu, eq(lieu.id, article.lieuId))
      .leftJoin(marque, eq(marque.id, article.marqueId))
      .where(and(eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe))),
    ids.length === 0
      ? []
      : base
          .select({ articleId: historiqueStatut.articleId, date: historiqueStatut.date })
          .from(historiqueStatut)
          .where(and(inArray(historiqueStatut.articleId, ids), eq(historiqueStatut.vers, "en_ligne"))),
    base.select({ id: sortie.id, date: sortie.date }).from(sortie).where(eq(sortie.utilisateurId, utilisateurId)),
    base
      .select({
        id: vente.id,
        dateVente: vente.dateVente,
        dateEnvoi: vente.dateEnvoi,
        dateFinalisation: vente.dateFinalisation,
      })
      .from(vente)
      .where(eq(vente.utilisateurId, utilisateurId)),
    base
      .select({ montant: boost.montant, date: boost.date })
      .from(boost)
      .innerJoin(article, eq(article.id, boost.articleId))
      .where(and(eq(boost.utilisateurId, utilisateurId), isNull(article.supprimeLe))),
    base
      .select({ date: fraisGeneral.date, montant: fraisGeneral.montant })
      .from(fraisGeneral)
      .where(eq(fraisGeneral.utilisateurId, utilisateurId)),
  ]);
  const mises = new Map<string, string[]>();
  for (const m of misesEnLigne) mises.set(m.articleId, [...(mises.get(m.articleId) ?? []), m.date.toISOString()]);
  return {
    calcul,
    articles: articles.map((a) => ({
      ...a,
      estMaison: a.estMaison ?? false,
      misesEnLigne: mises.get(a.id) ?? [],
      dateSortieStock: a.dateSortieStock?.toISOString() ?? null,
    })),
    datesSorties: new Map(sorties.map((s) => [s.id, s.date])),
    datesVentes: new Map(
      ventes.map((v) => [
        v.id,
        {
          vente: v.dateVente.toISOString(),
          envoi: v.dateEnvoi?.toISOString() ?? null,
          finalisation: v.dateFinalisation?.toISOString() ?? null,
        },
      ]),
    ),
    boosts,
    frais,
  };
}

/** Libellé lisible d'une branche de catégorie (ex. « Hommes › Vêtements › Jeans »). */
function libelleCategorie(code: string): string {
  const niveau = code.split("/").length;
  const feuille = CATEGORIES.find((c) => c.code === code || c.code.startsWith(`${code}/`));
  return feuille ? feuille.chemin.slice(0, niveau).join(" › ") : code;
}

export async function tableauDeBord(base: Base, utilisateurId: string, annee: number, mois: number, niveau: number) {
  const d = await chargerDonnees(base, utilisateurId);
  const details = calculerDetails(d.calcul);
  const parMois = indicateursParMois(d, details);
  const cleMois = (m: number) => `${annee}-${String(m).padStart(2, "0")}`;
  const vide: Periode = { chiffreAffaires: 0, beneficeRealise: 0, tresorerie: 0, fraisGeneraux: 0 };
  const serie = Array.from({ length: 12 }, (_, i) => ({
    mois: cleMois(i + 1),
    ...(parMois.get(cleMois(i + 1)) ?? vide),
  }));

  const [sorties, lieux] = await Promise.all([
    base
      .select({ id: sortie.id, date: sortie.date, lieu: lieu.nom })
      .from(sortie)
      .innerJoin(lieu, eq(lieu.id, sortie.lieuId))
      .where(eq(sortie.utilisateurId, utilisateurId)),
    base.select({ id: lieu.id, nom: lieu.nom }).from(lieu).where(eq(lieu.utilisateurId, utilisateurId)),
  ]);
  const nomsSorties = new Map(sorties.map((s) => [s.id, { libelle: s.lieu, date: s.date }]));
  const nomsLieux = new Map(lieux.map((l) => [l.id, l.nom]));
  const parSortie = rentabilite(d, details, "sortie");
  const parLieu = rentabilite(d, details, "lieu");

  return {
    annee,
    mois: cleMois(mois),
    duMois: parMois.get(cleMois(mois)) ?? vide,
    deLAnnee: cumuler(serie),
    serie,
    stock: valeurStock(d, details),
    rentabiliteSorties: {
      classement: parSortie.classement.map((r) => ({
        ...r,
        libelle: nomsSorties.get(r.cle)?.libelle ?? "",
        date: nomsSorties.get(r.cle)?.date ?? null,
      })),
      maison: parSortie.maison,
    },
    rentabiliteLieux: {
      classement: parLieu.classement.map((r) => ({ ...r, libelle: nomsLieux.get(r.cle) ?? "" })),
      maison: parLieu.maison,
    },
    analyse: {
      categories: analyser(d, details, "categorie", niveau).map((a) => ({ ...a, libelle: libelleCategorie(a.cle) })),
      marques: analyser(d, details, "marque").map((a) => ({ ...a, libelle: a.cle })),
      gammes: analyser(d, details, "gamme").map((a) => ({ ...a, libelle: a.cle })),
    },
  };
}
