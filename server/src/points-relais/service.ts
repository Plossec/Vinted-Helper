// Points relais (#210, ADR-0109) : liste de l'utilisateur, saisie à la main, reliée aux ventes.
import { and, asc, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { pointRelais, vente } from "../base/schema.js";
import { erreurSaisie, introuvable } from "../utilitaires/erreurs.js";
import type { CodeTransporteur, Horaires } from "./horaires.js";

export interface DonneesPointRelais {
  transporteur: CodeTransporteur;
  nom: string;
  adresse: string | null;
  numero: string | null;
  url: string | null;
  horaires: Horaires;
  notes: string | null;
  archive: boolean;
}

const colonnes = {
  id: pointRelais.id,
  transporteur: pointRelais.transporteur,
  nom: pointRelais.nom,
  adresse: pointRelais.adresse,
  numero: pointRelais.numero,
  url: pointRelais.url,
  horaires: pointRelais.horaires,
  vintedGoId: pointRelais.vintedGoId,
  vintedGoStatut: pointRelais.vintedGoStatut,
  vintedGoCapacite: pointRelais.vintedGoCapacite,
  vintedGoReleveLe: pointRelais.vintedGoReleveLe,
  vintedGoErreur: pointRelais.vintedGoErreur,
  vintedGoReleveDemandeLe: pointRelais.vintedGoReleveDemandeLe,
  notes: pointRelais.notes,
  archive: pointRelais.archive,
};

/** Tous les points (archivés compris : une vente passée peut encore en montrer un), actifs d'abord. */
export async function listerPointsRelais(base: Base, utilisateurId: string) {
  const points = await base
    .select(colonnes)
    .from(pointRelais)
    .where(eq(pointRelais.utilisateurId, utilisateurId))
    .orderBy(asc(pointRelais.archive), asc(pointRelais.transporteur), asc(sql`lower(${pointRelais.nom})`));
  return points.map((point) => ({
    ...point,
    vintedGoReleveLe: point.vintedGoReleveLe?.toISOString() ?? null,
    vintedGoReleveDemandeLe: point.vintedGoReleveDemandeLe?.toISOString() ?? null,
  }));
}

export interface ReleveVintedGo {
  vintedGoId: string;
  vintedGoStatut:
    "ouvert" | "capacite_faible" | "ferme" | "hors_service" | "pas_de_compartiments" | "ramassage_uniquement";
  horaires: Horaires;
  capacite: { miseAJour: string | null; tailles: { taille: "xs" | "s" | "m"; disponibles: string | null }[] } | null;
}

export async function lirePointRelais(base: Base, utilisateurId: string, id: string) {
  const [p] = await base
    .select(colonnes)
    .from(pointRelais)
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)));
  if (!p) throw introuvable("Point relais");
  return {
    ...p,
    vintedGoReleveLe: p.vintedGoReleveLe?.toISOString() ?? null,
    vintedGoReleveDemandeLe: p.vintedGoReleveDemandeLe?.toISOString() ?? null,
  };
}

export async function enregistrerReleveVintedGo(
  base: Base,
  utilisateurId: string,
  id: string,
  releve: ReleveVintedGo,
  maintenant: Date,
) {
  const point = await lirePointRelais(base, utilisateurId, id);
  if (point.transporteur !== "vinted_go") throw erreurSaisie("Ce point relais n'est pas un point Vinted Go.");
  const [modifie] = await base
    .update(pointRelais)
    .set({
      vintedGoId: releve.vintedGoId,
      vintedGoStatut: releve.vintedGoStatut,
      vintedGoCapacite: releve.capacite,
      vintedGoReleveLe: maintenant,
      vintedGoReleveDemandeLe: null,
      vintedGoErreur: null,
      horaires: releve.horaires,
    })
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)))
    .returning(colonnes);
  if (!modifie) throw introuvable("Point relais");
  return enIso(modifie);
}

/**
 * Relevé Vinted Go en échec (#262) : la raison est gardée et affichée sur la fiche ; le relevé compte comme fait
 * (le suivant attend 24 h, ou une nouvelle demande) pour ne pas rouvrir Vinted Go à chaque passage de l'extension.
 */
export async function noterEchecReleveVintedGo(
  base: Base,
  utilisateurId: string,
  id: string,
  erreur: string,
  maintenant: Date,
) {
  const point = await lirePointRelais(base, utilisateurId, id);
  if (point.transporteur !== "vinted_go") throw erreurSaisie("Ce point relais n'est pas un point Vinted Go.");
  const [modifie] = await base
    .update(pointRelais)
    .set({ vintedGoReleveLe: maintenant, vintedGoReleveDemandeLe: null, vintedGoErreur: erreur })
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)))
    .returning(colonnes);
  if (!modifie) throw introuvable("Point relais");
  return enIso(modifie);
}

/** Dates du relevé en texte ISO (format de l'API). */
function enIso<T extends { vintedGoReleveLe: Date | null; vintedGoReleveDemandeLe: Date | null }>(p: T) {
  return {
    ...p,
    vintedGoReleveLe: p.vintedGoReleveLe?.toISOString() ?? null,
    vintedGoReleveDemandeLe: p.vintedGoReleveDemandeLe?.toISOString() ?? null,
  };
}

export async function ajouterPointRelais(base: Base, utilisateurId: string, d: DonneesPointRelais) {
  const [cree] = await base
    .insert(pointRelais)
    .values({ utilisateurId, ...d })
    .returning(colonnes);
  return cree;
}

export async function demanderReleveVintedGo(base: Base, utilisateurId: string, id: string, maintenant: Date) {
  const point = await lirePointRelais(base, utilisateurId, id);
  if (point.transporteur !== "vinted_go") throw erreurSaisie("Ce point relais n'est pas un point Vinted Go.");
  const [maj] = await base
    .update(pointRelais)
    .set({ vintedGoReleveDemandeLe: maintenant })
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)))
    .returning(colonnes);
  if (!maj) throw introuvable("Point relais");
  return {
    ...maj,
    vintedGoReleveLe: maj.vintedGoReleveLe?.toISOString() ?? null,
    vintedGoReleveDemandeLe: maj.vintedGoReleveDemandeLe?.toISOString() ?? null,
  };
}

export async function pointVintedGoSuivant(base: Base, utilisateurId: string, maintenant: Date) {
  const limite = new Date(maintenant.getTime() - 24 * 60 * 60 * 1000);
  const [point] = await base
    .select(colonnes)
    .from(pointRelais)
    .where(
      and(
        eq(pointRelais.utilisateurId, utilisateurId),
        eq(pointRelais.transporteur, "vinted_go"),
        eq(pointRelais.archive, false),
        or(
          isNull(pointRelais.vintedGoReleveLe),
          lt(pointRelais.vintedGoReleveLe, limite),
          sql`${pointRelais.vintedGoReleveDemandeLe} is not null`,
        ),
      ),
    )
    .orderBy(desc(pointRelais.vintedGoReleveDemandeLe), asc(pointRelais.nom))
    .limit(1);
  if (!point) return null;
  return {
    ...point,
    vintedGoReleveLe: point.vintedGoReleveLe?.toISOString() ?? null,
    vintedGoReleveDemandeLe: point.vintedGoReleveDemandeLe?.toISOString() ?? null,
  };
}

export async function modifierPointRelais(base: Base, utilisateurId: string, id: string, d: DonneesPointRelais) {
  const actuel = await lirePointRelais(base, utilisateurId, id);
  // Point Vinted Go (#262) : les horaires viennent du relevé, jamais du formulaire ; ils sont gardés tels quels.
  const horaires = d.transporteur === "vinted_go" && actuel.transporteur === "vinted_go" ? actuel.horaires : d.horaires;
  const [modifie] = await base
    .update(pointRelais)
    .set({ ...d, horaires })
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)))
    .returning(colonnes);
  if (!modifie) throw introuvable("Point relais");
  return enIso(modifie);
}

/**
 * Points relais d'une vente : `undefined` = inchangé, `null` = retiré. Un point archivé ne peut pas être choisi, mais
 * reste en place sur les ventes qui l'avaient déjà.
 */
export async function choisirPointsRelais(
  base: Base,
  utilisateurId: string,
  venteId: string,
  choix: { pointDepotId: string | null | undefined; pointRetraitId: string | null | undefined },
) {
  const [v] = await base
    .select({ id: vente.id, pointDepotId: vente.pointDepotId, pointRetraitId: vente.pointRetraitId })
    .from(vente)
    .where(and(eq(vente.id, venteId), eq(vente.utilisateurId, utilisateurId)));
  if (!v) throw introuvable("Vente");
  for (const [cle, id] of Object.entries(choix)) {
    if (id === undefined || id === null || id === v[cle as keyof typeof v]) continue;
    const p = await lirePointRelais(base, utilisateurId, id);
    if (p.archive) throw erreurSaisie(`Le point relais « ${p.nom} » est archivé.`);
  }
  const maj = Object.fromEntries(Object.entries(choix).filter(([, id]) => id !== undefined));
  if (Object.keys(maj).length > 0) await base.update(vente).set(maj).where(eq(vente.id, venteId));
}
