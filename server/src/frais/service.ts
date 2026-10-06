// Boosts (§5.2), frais divers (§5.12) et réglages de l'utilisateur.
import { and, desc, eq } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { boost, fraisGeneral, reglages } from "../base/schema.js";
import { chargerArticle } from "../articles/service.js";
import { introuvable } from "../outils/erreurs.js";

export async function ajouterBoost(
  base: Base,
  utilisateurId: string,
  articleId: string,
  d: { montant: number; date: string },
) {
  await chargerArticle(base, utilisateurId, articleId);
  await base.insert(boost).values({ utilisateurId, articleId, ...d });
}

export async function supprimerBoost(base: Base, utilisateurId: string, id: string) {
  const r = await base
    .delete(boost)
    .where(and(eq(boost.id, id), eq(boost.utilisateurId, utilisateurId)))
    .returning({ id: boost.id });
  if (r.length === 0) throw introuvable("Boost");
}

export interface DonneesFrais {
  date: string;
  montant: number;
  libelle: string;
}

export async function listerFrais(base: Base, utilisateurId: string) {
  return base
    .select({
      id: fraisGeneral.id,
      date: fraisGeneral.date,
      montant: fraisGeneral.montant,
      libelle: fraisGeneral.libelle,
    })
    .from(fraisGeneral)
    .where(eq(fraisGeneral.utilisateurId, utilisateurId))
    .orderBy(desc(fraisGeneral.date), desc(fraisGeneral.id));
}

export async function ajouterFrais(base: Base, utilisateurId: string, d: DonneesFrais) {
  const [f] = await base
    .insert(fraisGeneral)
    .values({ utilisateurId, ...d })
    .returning({ id: fraisGeneral.id });
  return f?.id;
}

export async function modifierFrais(base: Base, utilisateurId: string, id: string, d: DonneesFrais) {
  const r = await base
    .update(fraisGeneral)
    .set(d)
    .where(and(eq(fraisGeneral.id, id), eq(fraisGeneral.utilisateurId, utilisateurId)))
    .returning({ id: fraisGeneral.id });
  if (r.length === 0) throw introuvable("Frais");
}

export async function supprimerFrais(base: Base, utilisateurId: string, id: string) {
  const r = await base
    .delete(fraisGeneral)
    .where(and(eq(fraisGeneral.id, id), eq(fraisGeneral.utilisateurId, utilisateurId)))
    .returning({ id: fraisGeneral.id });
  if (r.length === 0) throw introuvable("Frais");
}

export const REGLAGES_DEFAUT = {
  emballageDefaut: 8,
  delaiBrouillon: 3,
  delaiDormant: 7,
  promptAnnonce: null as string | null,
  promptEtiquette: null as string | null,
};

export type Reglages = typeof REGLAGES_DEFAUT;

export async function lireReglages(base: Base, utilisateurId: string): Promise<Reglages> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (!r) return { ...REGLAGES_DEFAUT };
  return {
    emballageDefaut: r.emballageDefaut,
    delaiBrouillon: r.delaiBrouillon,
    delaiDormant: r.delaiDormant,
    promptAnnonce: r.promptAnnonce,
    promptEtiquette: r.promptEtiquette,
  };
}

export async function modifierReglages(base: Base, utilisateurId: string, modif: Partial<Reglages>) {
  const valeurs = { ...(await lireReglages(base, utilisateurId)), ...modif };
  await base
    .insert(reglages)
    .values({ utilisateurId, ...valeurs })
    .onConflictDoUpdate({ target: reglages.utilisateurId, set: valeurs });
  return valeurs;
}
