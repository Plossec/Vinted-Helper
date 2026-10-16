// Tâche « Vérification vente finalisée » (#148, ADR-0074) : l'extension lit les commandes terminées de « Mes commandes
// › Ventes » sur Vinted ; chaque commande est rattachée à une vente de l'application par le lien de ses annonces, puis
// le colis passe « Finalisé » à la date de fin lue sur Vinted (automatique, ou à valider en mode manuel). Un montant
// différent est corrigé par celui de Vinted et signalé. Une commande non retrouvée est « à rattacher ».
import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { article, commandeVinted, reglages, vente, venteArticle } from "../base/schema.js";
import { verifierDate } from "../articles/service.js";
import { jourParis } from "../calculs/indicateurs.js";
import { passageDu } from "../metier/taches.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";
import { avancerVenteDans, chargerVente } from "../ventes/service.js";

export interface CommandeLue {
  /** Identifiant de la commande sur Vinted. */
  idCommande: string;
  /** Numéros des annonces de la commande (« 123 » de `/items/123-…`). */
  annonces: string[];
  dateFin: Date;
  /** Centimes crédités par Vinted, s'ils ont été lus. */
  montant: number | null;
}

/** Numéro de l'annonce dans un lien Vinted (`https://www.vinted.fr/items/123-titre`), sinon null. */
export const numeroAnnonce = (url: string | null): string | null =>
  url === null ? null : (/\/items\/(\d+)/.exec(url)?.[1] ?? null);

/** La lecture des commandes est-elle due (tâche activée, plage horaire, fréquence) ? */
export async function lectureCommandesDue(base: Base, utilisateurId: string, maintenant: Date): Promise<boolean> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (!r) return false;
  return passageDu(
    {
      active: r.finalisationActive,
      heureDebut: r.tachesHeureDebut,
      heureFin: r.tachesHeureFin,
      frequenceHeures: r.finalisationFrequenceHeures,
      dernierPassage: r.finalisationDernierPassage,
    },
    maintenant,
  );
}

/**
 * Vente de l'application correspondant à une commande : toutes ses annonces retrouvées parmi les articles Envoyés, et
 * le colis de l'application identique à la commande (mêmes articles). Sinon, la raison.
 */
async function venteDeLaCommande(
  tx: Transaction,
  utilisateurId: string,
  annonces: readonly string[],
): Promise<{ venteId: string } | { raison: string }> {
  const envoyes = await tx
    .select({ id: article.id, urlVinted: article.urlVinted })
    .from(article)
    .where(and(eq(article.utilisateurId, utilisateurId), eq(article.statut, "envoye"), isNull(article.supprimeLe)));
  const retrouves = envoyes.filter((a) => annonces.includes(numeroAnnonce(a.urlVinted) ?? ""));
  if (retrouves.length === 0) return { raison: "Aucun article Envoyé ne porte le lien de cette annonce." };
  if (retrouves.length !== annonces.length)
    return { raison: "Une partie seulement des annonces de la commande a été retrouvée parmi les articles Envoyés." };
  const lignes = await tx
    .select({ venteId: venteArticle.venteId })
    .from(venteArticle)
    .innerJoin(vente, eq(vente.id, venteArticle.venteId))
    .where(
      and(
        inArray(
          venteArticle.articleId,
          retrouves.map((a) => a.id),
        ),
        eq(venteArticle.retourne, false),
        eq(vente.annulee, false),
        eq(vente.utilisateurId, utilisateurId),
      ),
    );
  const ventes = [...new Set(lignes.map((l) => l.venteId))];
  if (ventes.length !== 1 || !ventes[0]) return { raison: "Les articles retrouvés ne sont pas dans un même colis." };
  const { actifs } = await chargerVente(tx, utilisateurId, ventes[0]);
  if (actifs.length !== retrouves.length || !actifs.every((a) => retrouves.some((r) => r.id === a.id)))
    return { raison: "Le colis de l'application ne contient pas les mêmes articles que la commande Vinted." };
  return { venteId: ventes[0] };
}

/**
 * Applique une commande à sa vente : montant Vinted s'il diffère (l'ancien est gardé pour l'alerte), puis tout le colis
 * passe « Finalisé » à la date de fin de la commande.
 */
async function appliquer(
  tx: Transaction,
  utilisateurId: string,
  c: { id: string; venteId: string; dateFin: Date; montant: number | null },
  maintenant: Date,
) {
  const { vente: v, actifs } = await chargerVente(tx, utilisateurId, c.venteId);
  if (actifs.length === 0 || !actifs.every((a) => a.statut === "envoye"))
    throw conflit("Ce colis n'est plus « Envoyé » (déjà finalisé ou modifié) : rien à faire.");
  verifierDate(c.dateFin, maintenant);
  const corrige = c.montant !== null && c.montant !== v.montantCredite;
  if (corrige && c.montant !== null)
    await tx.update(vente).set({ montantCredite: c.montant }).where(eq(vente.id, c.venteId));
  await avancerVenteDans(tx, utilisateurId, c.venteId, "finalise", c.dateFin, maintenant);
  await tx
    .update(commandeVinted)
    .set({
      etat: "appliquee",
      venteId: c.venteId,
      montantAvant: corrige ? v.montantCredite : null,
      traiteLe: maintenant,
      message: null,
    })
    .where(eq(commandeVinted.id, c.id));
}

/**
 * Commandes terminées envoyées par l'extension. En mode essai (réglages ou extension), rien n'est enregistré : seule
 * la date de la lecture l'est. Une commande déjà connue est ignorée.
 */
export async function recevoirCommandes(
  base: Base,
  utilisateurId: string,
  d: { essai: boolean; commandes: CommandeLue[] },
  maintenant: Date,
): Promise<{ nouvelles: number }> {
  return base.transaction(async (tx) => {
    const [r] = await tx
      .update(reglages)
      .set({ finalisationDernierPassage: maintenant })
      .where(eq(reglages.utilisateurId, utilisateurId))
      .returning();
    if (!r || d.essai || r.tachesEssai) return { nouvelles: 0 };
    const debutJour = new Date(maintenant.getTime() - 2 * 86_400_000);
    const recentes = await tx
      .select({ traiteLe: commandeVinted.traiteLe })
      .from(commandeVinted)
      .where(
        and(
          eq(commandeVinted.utilisateurId, utilisateurId),
          eq(commandeVinted.etat, "appliquee"),
          gte(commandeVinted.traiteLe, debutJour),
        ),
      );
    const aujourdhui = jourParis(maintenant.toISOString());
    let faites = recentes.filter((x) => x.traiteLe && jourParis(x.traiteLe.toISOString()) === aujourdhui).length;
    let nouvelles = 0;
    for (const c of d.commandes) {
      const [cree] = await tx
        .insert(commandeVinted)
        .values({
          utilisateurId,
          idCommande: c.idCommande,
          annonces: c.annonces,
          dateFin: c.dateFin,
          montant: c.montant,
          etat: "a_rattacher",
          creeLe: maintenant,
        })
        .onConflictDoNothing()
        .returning({ id: commandeVinted.id });
      if (!cree) continue; // déjà lue
      nouvelles++;
      const trouvee = await venteDeLaCommande(tx, utilisateurId, c.annonces);
      if ("raison" in trouvee) {
        await tx.update(commandeVinted).set({ message: trouvee.raison }).where(eq(commandeVinted.id, cree.id));
        continue;
      }
      await tx
        .update(commandeVinted)
        .set({ etat: "a_valider", venteId: trouvee.venteId })
        .where(eq(commandeVinted.id, cree.id));
      if (r.finalisationMode !== "automatique" || faites >= r.finalisationPlafond) continue;
      // Échec d'une finalisation automatique (date dans le futur…) : la commande reste à valider, avec la raison.
      try {
        await tx.transaction((sp) =>
          appliquer(
            sp,
            utilisateurId,
            { id: cree.id, venteId: trouvee.venteId, dateFin: c.dateFin, montant: c.montant },
            maintenant,
          ),
        );
        faites++;
      } catch (erreur) {
        await tx
          .update(commandeVinted)
          .set({ message: erreur instanceof Error ? erreur.message : String(erreur) })
          .where(eq(commandeVinted.id, cree.id));
      }
    }
    return { nouvelles };
  });
}

/** Commande de l'utilisateur dans l'état attendu, sinon erreur. */
async function commande(tx: Transaction, utilisateurId: string, id: string, etats: ("a_valider" | "a_rattacher")[]) {
  const [c] = await tx
    .select()
    .from(commandeVinted)
    .where(and(eq(commandeVinted.id, id), eq(commandeVinted.utilisateurId, utilisateurId)));
  if (!c) throw introuvable("Commande");
  if (!(etats as string[]).includes(c.etat)) throw conflit("Cette commande a déjà été traitée.");
  return c;
}

/** « Appliquer » des commandes à valider (mode manuel) : finalisation des colis. Renvoie le nombre appliqué. */
export async function appliquerCommandes(base: Base, utilisateurId: string, ids: string[], maintenant: Date) {
  if (ids.length === 0) throw erreurSaisie("Cochez au moins une commande.");
  let nombre = 0;
  for (const id of ids) {
    await base.transaction(async (tx) => {
      const c = await commande(tx, utilisateurId, id, ["a_valider"]);
      if (!c.venteId) throw conflit("Commande sans vente rattachée.");
      await appliquer(
        tx,
        utilisateurId,
        { id: c.id, venteId: c.venteId, dateFin: c.dateFin, montant: c.montant },
        maintenant,
      );
    });
    nombre++;
  }
  return nombre;
}

/** « Refuser » des commandes à valider, ou « Ignorer » des commandes à rattacher : rien ne change dans les ventes. */
export async function ecarterCommandes(base: Base, utilisateurId: string, ids: string[], maintenant: Date) {
  if (ids.length === 0) throw erreurSaisie("Cochez au moins une commande.");
  let nombre = 0;
  for (const [de, vers] of [
    ["a_valider", "refusee"],
    ["a_rattacher", "ignoree"],
  ] as const) {
    const r = await base
      .update(commandeVinted)
      .set({ etat: vers, traiteLe: maintenant })
      .where(
        and(
          eq(commandeVinted.utilisateurId, utilisateurId),
          inArray(commandeVinted.id, ids),
          eq(commandeVinted.etat, de),
        ),
      )
      .returning({ id: commandeVinted.id });
    nombre += r.length;
  }
  return nombre;
}

/**
 * « Rattacher » une commande à l'article Envoyé choisi par l'utilisateur : le lien de l'annonce est enregistré sur
 * l'article (commande d'une seule annonce), puis le colis de cet article passe « Finalisé ».
 */
export async function rattacherCommande(
  base: Base,
  utilisateurId: string,
  id: string,
  articleId: string,
  maintenant: Date,
) {
  await base.transaction(async (tx) => {
    const c = await commande(tx, utilisateurId, id, ["a_rattacher", "a_valider"]);
    const [a] = await tx
      .select({ id: article.id, statut: article.statut })
      .from(article)
      .where(and(eq(article.id, articleId), eq(article.utilisateurId, utilisateurId), isNull(article.supprimeLe)));
    if (!a) throw introuvable("Article");
    if (a.statut !== "envoye") throw conflit("Choisissez un article « Envoyé ».");
    const [ligne] = await tx
      .select({ venteId: venteArticle.venteId })
      .from(venteArticle)
      .innerJoin(vente, eq(vente.id, venteArticle.venteId))
      .where(and(eq(venteArticle.articleId, a.id), eq(venteArticle.retourne, false), eq(vente.annulee, false)))
      .orderBy(desc(vente.creeLe))
      .limit(1);
    if (!ligne) throw conflit("Vente de cet article introuvable.");
    const [annonce] = c.annonces;
    if (c.annonces.length === 1 && annonce)
      await tx
        .update(article)
        .set({ urlVinted: `https://www.vinted.fr/items/${annonce}`, modifieLe: maintenant })
        .where(eq(article.id, a.id));
    await appliquer(
      tx,
      utilisateurId,
      { id: c.id, venteId: ligne.venteId, dateFin: c.dateFin, montant: c.montant },
      maintenant,
    );
  });
}

/** Alerte « montant corrigé » marquée « Vu ». */
export async function marquerMontantVu(base: Base, utilisateurId: string, id: string) {
  const r = await base
    .update(commandeVinted)
    .set({ vu: true })
    .where(and(eq(commandeVinted.id, id), eq(commandeVinted.utilisateurId, utilisateurId)))
    .returning({ id: commandeVinted.id });
  if (r.length === 0) throw introuvable("Commande");
}

/** Commandes à valider, à rattacher, montants corrigés non vus, et les dernières traitées ; avec les articles du colis. */
export async function listerCommandes(base: Base, utilisateurId: string) {
  const lignes = await base
    .select()
    .from(commandeVinted)
    .where(eq(commandeVinted.utilisateurId, utilisateurId))
    .orderBy(desc(commandeVinted.dateFin))
    .limit(200);
  const venteIds = [...new Set(lignes.flatMap((l) => (l.venteId ? [l.venteId] : [])))];
  const articles =
    venteIds.length === 0
      ? []
      : await base
          .select({
            venteId: venteArticle.venteId,
            id: article.id,
            reference: article.reference,
            nom: article.nom,
            montantCredite: vente.montantCredite,
          })
          .from(venteArticle)
          .innerJoin(article, eq(article.id, venteArticle.articleId))
          .innerJoin(vente, eq(vente.id, venteArticle.venteId))
          .where(and(inArray(venteArticle.venteId, venteIds), eq(venteArticle.retourne, false)))
          .orderBy(article.reference);
  const decrire = (l: (typeof lignes)[number]) => {
    const du = articles.filter((a) => a.venteId === l.venteId);
    return {
      id: l.id,
      idCommande: l.idCommande,
      annonces: l.annonces,
      dateFin: l.dateFin,
      montant: l.montant,
      montantAvant: l.montantAvant,
      etat: l.etat,
      message: l.message,
      vente: l.venteId
        ? {
            id: l.venteId,
            montantCredite: du[0]?.montantCredite ?? null,
            articles: du.map((a) => ({ id: a.id, reference: a.reference, nom: a.nom })),
          }
        : null,
    };
  };
  return {
    aValider: lignes.filter((l) => l.etat === "a_valider").map(decrire),
    aRattacher: lignes.filter((l) => l.etat === "a_rattacher").map(decrire),
    montantsCorriges: lignes.filter((l) => l.etat === "appliquee" && l.montantAvant !== null && !l.vu).map(decrire),
    journal: lignes
      .filter((l) => l.etat === "appliquee" || l.etat === "refusee" || l.etat === "ignoree")
      .slice(0, 30)
      .map(decrire),
  };
}

/** Nombres pour la pastille de l'écran « À faire ». */
export async function nombresCommandes(base: Base, utilisateurId: string) {
  const l = await listerCommandes(base, utilisateurId);
  return { aValider: l.aValider.length, aRattacher: l.aRattacher.length, montantsCorriges: l.montantsCorriges.length };
}
