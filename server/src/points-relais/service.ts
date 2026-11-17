// Points relais (#210, ADR-0109) : liste de l'utilisateur, saisie à la main, reliée aux ventes.
import { and, asc, eq, sql } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { pointRelais, vente } from "../base/schema.js";
import { erreurSaisie, introuvable } from "../outils/erreurs.js";
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
  notes: pointRelais.notes,
  archive: pointRelais.archive,
};

/** Tous les points (archivés compris : une vente passée peut encore en montrer un), actifs d'abord. */
export function listerPointsRelais(base: Base, utilisateurId: string) {
  return base
    .select(colonnes)
    .from(pointRelais)
    .where(eq(pointRelais.utilisateurId, utilisateurId))
    .orderBy(asc(pointRelais.archive), asc(pointRelais.transporteur), asc(sql`lower(${pointRelais.nom})`));
}

export async function lirePointRelais(base: Base, utilisateurId: string, id: string) {
  const [p] = await base
    .select(colonnes)
    .from(pointRelais)
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)));
  if (!p) throw introuvable("Point relais");
  return p;
}

export async function ajouterPointRelais(base: Base, utilisateurId: string, d: DonneesPointRelais) {
  const [cree] = await base
    .insert(pointRelais)
    .values({ utilisateurId, ...d })
    .returning(colonnes);
  return cree;
}

export async function modifierPointRelais(base: Base, utilisateurId: string, id: string, d: DonneesPointRelais) {
  await lirePointRelais(base, utilisateurId, id);
  const [modifie] = await base
    .update(pointRelais)
    .set(d)
    .where(and(eq(pointRelais.id, id), eq(pointRelais.utilisateurId, utilisateurId)))
    .returning(colonnes);
  return modifie;
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
