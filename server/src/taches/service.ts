// Tâches automatisées (#147, ADR-0072, ADR-0073) : planification des actions sur les articles dormants, au passage de
// l'extension (seule à agir sur Vinted), liste à valider (mode manuel) et journal des actions.
import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import type { Base, Transaction } from "../base/connexion.js";
import { actionVinted, article, historiquePrix, historiqueStatut, reglages } from "../base/schema.js";
import { jourParis } from "../calculs/indicateurs.js";
import { calculerAlertes } from "../metier/alertes.js";
import { type CandidatDormant, heureParis, passageDu, planifierDormants } from "../metier/taches.js";
import { conflit, erreurSaisie, introuvable } from "../outils/erreurs.js";
import { centimesVersSaisie } from "../outils/format.js";
import { annonceARepublier } from "../publication/service.js";

const EN_COURS = ["a_valider", "en_attente", "en_cours"] as const;

/** Articles En ligne dormants (§5.8, une republication relance le délai), les plus anciens d'abord. */
async function candidatsDormants(
  tx: Transaction,
  utilisateurId: string,
  delaiDormant: number,
  maintenant: Date,
): Promise<CandidatDormant[]> {
  const articles = await tx
    .select({
      id: article.id,
      reference: article.reference,
      nom: article.nom,
      statut: article.statut,
      prixAffiche: article.prixAffiche,
      prixVenteMinimum: article.prixVenteMinimum,
      baisseRegle: article.baisseRegle,
      baisseValeur: article.baisseValeur,
      urlVinted: article.urlVinted,
    })
    .from(article)
    .where(and(eq(article.utilisateurId, utilisateurId), eq(article.statut, "en_ligne"), isNull(article.supprimeLe)));
  if (articles.length === 0) return [];
  const ids = articles.map((a) => a.id);
  const [historiques, prix, actions] = await Promise.all([
    tx
      .select({ articleId: historiqueStatut.articleId, vers: historiqueStatut.vers, date: historiqueStatut.date })
      .from(historiqueStatut)
      .where(inArray(historiqueStatut.articleId, ids)),
    tx
      .select({ articleId: historiquePrix.articleId, prix: historiquePrix.prix, date: historiquePrix.date })
      .from(historiquePrix)
      .where(inArray(historiquePrix.articleId, ids)),
    tx
      .select({
        articleId: actionVinted.articleId,
        type: actionVinted.type,
        etat: actionVinted.etat,
        finLe: actionVinted.finLe,
      })
      .from(actionVinted)
      .where(inArray(actionVinted.articleId, ids)),
  ]);
  const parId = new Map(articles.map((a) => [a.id, a]));
  const details = articles.map((a) => {
    const historique = historiques.filter((h) => h.articleId === a.id);
    const miseEnLigne = Math.max(0, ...historique.filter((h) => h.vers === "en_ligne").map((h) => h.date.getTime()));
    const republiees = actions
      .filter((x) => x.articleId === a.id && x.type === "republication" && x.etat === "faite" && x.finLe !== null)
      .map((x) => x.finLe?.getTime() ?? 0);
    const derniere = republiees.length > 0 ? Math.max(...republiees) : null;
    return {
      a,
      republications: republiees.filter((t) => t > miseEnLigne).length,
      actionEnCours: actions.some((x) => x.articleId === a.id && (EN_COURS as readonly string[]).includes(x.etat)),
      alerte: {
        id: a.id,
        reference: a.reference,
        nom: a.nom,
        statut: a.statut,
        historique: historique.map((h) => ({ vers: h.vers, date: h.date.toISOString() })),
        historiquePrix: prix
          .filter((p) => p.articleId === a.id)
          .map((p) => ({ prix: p.prix, date: p.date.toISOString() })),
        derniereRepublication: derniere === null ? null : new Date(derniere).toISOString(),
      },
    };
  });
  const parArticle = new Map(details.map((d) => [d.a.id, d]));
  const { dormants } = calculerAlertes(
    details.map((d) => d.alerte),
    { delaiBrouillon: Number.MAX_SAFE_INTEGER, delaiDormant },
    maintenant,
  );
  return dormants.flatMap((al) => {
    const d = parArticle.get(al.id);
    const a = parId.get(al.id);
    if (!d || !a) return [];
    return [{ ...a, republications: d.republications, actionEnCours: d.actionEnCours }];
  });
}

/** Actions déjà prévues aujourd'hui (heure de Paris), par type, pour les plafonds par jour. */
async function actionsDuJour(tx: Transaction, utilisateurId: string, maintenant: Date) {
  const lignes = await tx
    .select({ type: actionVinted.type, creeLe: actionVinted.creeLe })
    .from(actionVinted)
    .where(
      and(
        eq(actionVinted.utilisateurId, utilisateurId),
        gte(actionVinted.creeLe, new Date(maintenant.getTime() - 2 * 86_400_000)),
        ne(actionVinted.etat, "refusee"),
        ne(actionVinted.etat, "annulee"),
      ),
    );
  const aujourdhui = jourParis(maintenant.toISOString());
  const du = lignes.filter((l) => jourParis(l.creeLe.toISOString()) === aujourdhui);
  return {
    baisse: du.filter((l) => l.type === "baisse").length,
    republication: du.filter((l) => l.type === "republication").length,
  };
}

/**
 * Passage de la tâche « Articles dormants », appelé à chaque passage de l'extension : si la tâche est activée, dans la
 * plage horaire et à sa fréquence, ajoute une action par article dormant (à valider en mode manuel) et fait passer
 * « Invendu » les articles republiés 3 fois sans vente.
 */
export async function planifierTaches(base: Base, utilisateurId: string, maintenant: Date): Promise<void> {
  const [r] = await base.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
  if (!r) return;
  const du = passageDu(
    {
      active: r.dormantsActive,
      heureDebut: r.tachesHeureDebut,
      heureFin: r.tachesHeureFin,
      frequenceHeures: r.dormantsFrequenceHeures,
      dernierPassage: r.dormantsDernierPassage,
    },
    maintenant,
  );
  if (!du) return;
  await base.transaction(async (tx) => {
    // Un seul passage, même si deux appels arrivent ensemble : la date du dernier passage n'est prise qu'une fois.
    const pris = await tx
      .update(reglages)
      .set({ dormantsDernierPassage: maintenant })
      .where(
        and(
          eq(reglages.utilisateurId, utilisateurId),
          r.dormantsDernierPassage === null
            ? isNull(reglages.dormantsDernierPassage)
            : eq(reglages.dormantsDernierPassage, r.dormantsDernierPassage),
        ),
      )
      .returning({ id: reglages.utilisateurId });
    if (pris.length === 0) return;
    const candidats = await candidatsDormants(tx, utilisateurId, r.delaiDormant, maintenant);
    const { actions, invendus } = planifierDormants(candidats, {
      regleCompte: { type: r.dormantsBaisseType, valeur: r.dormantsBaisseValeur },
      plafondBaisses: r.dormantsPlafondBaisses,
      plafondRepublications: r.dormantsPlafondRepublications,
      dejaAujourdhui: await actionsDuJour(tx, utilisateurId, maintenant),
    });
    if (actions.length > 0) {
      await tx.insert(actionVinted).values(
        actions.map((a) => ({
          utilisateurId,
          ...a,
          etat: r.dormantsMode === "automatique" ? ("en_attente" as const) : ("a_valider" as const),
          essai: r.tachesEssai,
          creeLe: maintenant,
        })),
      );
    }
    // Invendu : passage fait par la tâche seule (absent du tableau du §4.2 proposé à l'utilisateur).
    for (const articleId of invendus) {
      const modifies = await tx
        .update(article)
        .set({ statut: "invendu", modifieLe: maintenant })
        .where(and(eq(article.id, articleId), eq(article.statut, "en_ligne")))
        .returning({ id: article.id });
      if (modifies.length > 0)
        await tx
          .insert(historiqueStatut)
          .values({ utilisateurId, articleId, de: "en_ligne", vers: "invendu", date: maintenant });
    }
  });
}

/**
 * Actions prévues devenues sans objet (article vendu, retiré, mis à la corbeille, ou prix changé à la main) :
 * annulées avant d'être montrées ou exécutées.
 */
export async function annulerActionsPerimees(base: Base | Transaction, utilisateurId: string, maintenant: Date) {
  const prevues = await base
    .select({
      id: actionVinted.id,
      prixAvant: actionVinted.prixAvant,
      statut: article.statut,
      prixAffiche: article.prixAffiche,
      supprimeLe: article.supprimeLe,
    })
    .from(actionVinted)
    .innerJoin(article, eq(article.id, actionVinted.articleId))
    .where(
      and(
        eq(actionVinted.utilisateurId, utilisateurId),
        or(eq(actionVinted.etat, "a_valider"), eq(actionVinted.etat, "en_attente")),
      ),
    );
  const perimees = prevues.filter(
    (p) => p.statut !== "en_ligne" || p.prixAffiche !== p.prixAvant || p.supprimeLe !== null,
  );
  if (perimees.length === 0) return;
  await base
    .update(actionVinted)
    .set({
      etat: "annulee",
      message: "Article modifié entre-temps (statut ou prix) : action annulée.",
      finLe: maintenant,
    })
    .where(
      and(
        inArray(
          actionVinted.id,
          perimees.map((p) => p.id),
        ),
        or(eq(actionVinted.etat, "a_valider"), eq(actionVinted.etat, "en_attente")),
      ),
    );
}

/** Liste à valider (mode manuel) et journal des dernières actions, avec l'article concerné. */
export async function listerActions(base: Base, utilisateurId: string, maintenant: Date) {
  await annulerActionsPerimees(base, utilisateurId, maintenant);
  const lignes = await base
    .select({
      id: actionVinted.id,
      articleId: actionVinted.articleId,
      reference: article.reference,
      nom: article.nom,
      type: actionVinted.type,
      etat: actionVinted.etat,
      prixAvant: actionVinted.prixAvant,
      prixApres: actionVinted.prixApres,
      essai: actionVinted.essai,
      message: actionVinted.message,
      url: actionVinted.url,
      creeLe: actionVinted.creeLe,
      finLe: actionVinted.finLe,
    })
    .from(actionVinted)
    .innerJoin(article, eq(article.id, actionVinted.articleId))
    .where(eq(actionVinted.utilisateurId, utilisateurId))
    .orderBy(desc(actionVinted.creeLe), article.reference)
    .limit(200);
  return {
    aValider: lignes.filter((l) => l.etat === "a_valider"),
    journal: lignes.filter((l) => l.etat !== "a_valider").slice(0, 50),
  };
}

/** « Appliquer » (→ en attente de l'extension) ou « Refuser » des actions à valider. */
export async function validerActions(
  base: Base,
  utilisateurId: string,
  ids: string[],
  appliquer: boolean,
  maintenant: Date,
): Promise<number> {
  if (ids.length === 0) throw erreurSaisie("Cochez au moins une action.");
  await annulerActionsPerimees(base, utilisateurId, maintenant);
  const r = await base
    .update(actionVinted)
    .set(appliquer ? { etat: "en_attente" } : { etat: "refusee", finLe: maintenant })
    .where(
      and(
        eq(actionVinted.utilisateurId, utilisateurId),
        inArray(actionVinted.id, ids),
        eq(actionVinted.etat, "a_valider"),
      ),
    )
    .returning({ id: actionVinted.id });
  return r.length;
}

/** Nombre d'actions à valider (pastille de l'écran « À faire »). */
export async function nombreAValider(base: Base, utilisateurId: string): Promise<number> {
  const r = await base
    .select({ id: actionVinted.id })
    .from(actionVinted)
    .where(and(eq(actionVinted.utilisateurId, utilisateurId), eq(actionVinted.etat, "a_valider")));
  return r.length;
}

/** Actions en attente de l'extension (réponse au passage de l'extension). */
export async function nombreActionsEnAttente(base: Base, utilisateurId: string): Promise<number> {
  const r = await base
    .select({ id: actionVinted.id })
    .from(actionVinted)
    .where(and(eq(actionVinted.utilisateurId, utilisateurId), eq(actionVinted.etat, "en_attente")));
  return r.length;
}

/** Au-delà, une action restée « en cours » est considérée interrompue (Chrome fermé, extension rechargée). */
const DELAI_INTERRUPTION_MS = 15 * 60_000;

/**
 * Action suivante pour l'extension (#147, ADR-0078), passée « en cours » : une seule à la fois, dans la plage horaire,
 * après la pause réglée depuis la dernière action du même type, la plus ancienne d'abord. Le mode essai est celui des
 * réglages au moment où l'action est confiée. Une action interrompue n'est jamais relancée seule.
 */
export async function actionSuivante(base: Base, utilisateurId: string, maintenant: Date) {
  return base.transaction(async (tx) => {
    // Un seul appel à la fois (comme la publication, #121) : deux appels simultanés ne prennent pas la même action.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`actions:${utilisateurId}`}))`);
    await tx
      .update(actionVinted)
      .set({
        etat: "erreur",
        finLe: maintenant,
        message: "Action interrompue (Chrome fermé ou extension rechargée) : vérifiez l'annonce sur Vinted.",
      })
      .where(
        and(
          eq(actionVinted.utilisateurId, utilisateurId),
          eq(actionVinted.etat, "en_cours"),
          lt(actionVinted.debutLe, new Date(maintenant.getTime() - DELAI_INTERRUPTION_MS)),
        ),
      );
    const [enCours] = await tx
      .select({ id: actionVinted.id })
      .from(actionVinted)
      .where(and(eq(actionVinted.utilisateurId, utilisateurId), eq(actionVinted.etat, "en_cours")));
    if (enCours) return null;
    const [r] = await tx.select().from(reglages).where(eq(reglages.utilisateurId, utilisateurId));
    if (!r) return null;
    const heure = heureParis(maintenant);
    if (heure < r.tachesHeureDebut || heure >= r.tachesHeureFin) return null;
    await annulerActionsPerimees(tx, utilisateurId, maintenant);
    const pauses = { baisse: r.dormantsPauseBaisse, republication: r.dormantsPauseRepublication };
    const fins = await tx
      .select({ type: actionVinted.type, finLe: actionVinted.finLe })
      .from(actionVinted)
      .where(
        and(
          eq(actionVinted.utilisateurId, utilisateurId),
          inArray(actionVinted.etat, ["faite", "essai", "erreur"]),
          gte(actionVinted.finLe, new Date(maintenant.getTime() - 3 * 3_600_000)),
        ),
      );
    const pret = (type: "baisse" | "republication") =>
      !fins.some((f) => f.type === type && f.finLe && maintenant.getTime() - f.finLe.getTime() < pauses[type] * 1000);
    const attente = await tx
      .select({
        id: actionVinted.id,
        articleId: actionVinted.articleId,
        type: actionVinted.type,
        prixAvant: actionVinted.prixAvant,
        prixApres: actionVinted.prixApres,
        reference: article.reference,
        titre: article.titreAnnonce,
        urlVinted: article.urlVinted,
      })
      .from(actionVinted)
      .innerJoin(article, eq(article.id, actionVinted.articleId))
      .where(and(eq(actionVinted.utilisateurId, utilisateurId), eq(actionVinted.etat, "en_attente")))
      .orderBy(asc(actionVinted.creeLe), asc(article.reference));
    for (const a of attente) {
      if (!pret(a.type)) continue;
      const echec = (message: string) =>
        tx.update(actionVinted).set({ etat: "erreur", finLe: maintenant, message }).where(eq(actionVinted.id, a.id));
      if (!a.urlVinted) {
        await echec("Article sans lien d'annonce Vinted : action impossible.");
        continue;
      }
      // Republication : l'annonce est recréée avec les données de l'article, qui doit être complet.
      const annonce = a.type === "republication" ? await annonceARepublier(tx, utilisateurId, a.articleId) : null;
      if (a.type === "republication" && !annonce) {
        await echec("Annonce incomplète : complétez l'article avant de le republier.");
        continue;
      }
      const prise = await tx
        .update(actionVinted)
        .set({ etat: "en_cours", debutLe: maintenant, essai: r.tachesEssai })
        .where(and(eq(actionVinted.id, a.id), eq(actionVinted.etat, "en_attente")))
        .returning({ id: actionVinted.id });
      if (prise.length === 0) return null;
      return {
        id: a.id,
        type: a.type,
        essai: r.tachesEssai,
        reference: a.reference,
        titre: a.titre ?? "",
        /** Lien de l'annonce actuelle. */
        url: a.urlVinted,
        /** Euros, tels que saisis sur Vinted (ex. « 9,50 »). */
        prixAvant: centimesVersSaisie(a.prixAvant),
        prixApres: a.prixApres === null ? null : centimesVersSaisie(a.prixApres),
        /** Republication : annonce à recréer (mêmes données que la publication). */
        annonce,
      };
    }
    return null;
  });
}

export type ResultatAction =
  | { resultat: "essai" }
  | { resultat: "fait"; url: string | null }
  | { resultat: "erreur"; message: string; annonceSupprimee: boolean };

/**
 * Résultat d'une action renvoyé par l'extension. Faite : une baisse change le prix affiché (et son historique, qui
 * relance le délai dormant) ; une republication enregistre le lien de la nouvelle annonce. Erreur après suppression de
 * l'ancienne annonce (la nouvelle n'a pas pu être créée) : l'article passe « Erreur » (#72), à republier d'un clic.
 * Essai : rien ne change. Un résultat envoyé deux fois est refusé.
 */
export async function enregistrerResultatAction(
  base: Base,
  utilisateurId: string,
  id: string,
  r: ResultatAction,
  maintenant: Date,
) {
  await base.transaction(async (tx) => {
    const [x] = await tx
      .update(actionVinted)
      .set({
        etat: r.resultat === "fait" ? "faite" : r.resultat,
        finLe: maintenant,
        message:
          r.resultat === "erreur"
            ? r.message
            : r.resultat === "essai"
              ? "Essai : pages Vinted ouvertes, rien n'a été modifié."
              : null,
        url: r.resultat === "fait" ? r.url : null,
      })
      .where(
        and(eq(actionVinted.id, id), eq(actionVinted.utilisateurId, utilisateurId), eq(actionVinted.etat, "en_cours")),
      )
      .returning({
        type: actionVinted.type,
        articleId: actionVinted.articleId,
        essai: actionVinted.essai,
        prixApres: actionVinted.prixApres,
      });
    if (!x) {
      const [existe] = await tx
        .select({ id: actionVinted.id })
        .from(actionVinted)
        .where(and(eq(actionVinted.id, id), eq(actionVinted.utilisateurId, utilisateurId)));
      throw existe ? conflit("Cette action n'est pas en cours.") : introuvable("Action");
    }
    if (r.resultat === "fait") {
      if (x.essai) throw conflit("Action en mode essai : rien ne devait être modifié sur Vinted.");
      if (x.type === "baisse" && x.prixApres !== null) {
        await tx
          .update(article)
          .set({ prixAffiche: x.prixApres, modifieLe: maintenant })
          .where(eq(article.id, x.articleId));
        await tx
          .insert(historiquePrix)
          .values({ utilisateurId, articleId: x.articleId, prix: x.prixApres, date: maintenant });
      }
      if (x.type === "republication") {
        if (!r.url) throw erreurSaisie("Republication : lien de la nouvelle annonce manquant.");
        await tx.update(article).set({ urlVinted: r.url, modifieLe: maintenant }).where(eq(article.id, x.articleId));
      }
    }
    if (r.resultat === "erreur" && r.annonceSupprimee && !x.essai) {
      const modifies = await tx
        .update(article)
        .set({ statut: "erreur_publication", urlVinted: null, modifieLe: maintenant })
        .where(and(eq(article.id, x.articleId), eq(article.statut, "en_ligne")))
        .returning({ id: article.id });
      if (modifies.length > 0)
        await tx.insert(historiqueStatut).values({
          utilisateurId,
          articleId: x.articleId,
          de: "en_ligne",
          vers: "erreur_publication",
          date: maintenant,
        });
    }
  });
}
