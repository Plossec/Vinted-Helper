// Sessions de connexion : jeton aléatoire dans un cookie, seule son empreinte est stockée en base.
// Durée : 30 jours sans utilisation, prolongée à chaque usage (décision du 05/10/2026).
import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import type { Base } from "../base/connexion.js";
import { session, utilisateur } from "../base/schema.js";

export const NOM_COOKIE = "vh_session";
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
/** On ne réécrit la date d'expiration qu'au plus une fois par heure (évite une écriture à chaque requête). */
const DELAI_PROLONGATION_MS = 60 * 60 * 1000;

export interface UtilisateurConnecte {
  id: string;
  identifiant: string;
}

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export async function creerSession(base: Base, utilisateurId: string, maintenant: Date): Promise<string> {
  const jeton = randomBytes(32).toString("base64url");
  await base.insert(session).values({
    id: empreinte(jeton),
    utilisateurId,
    expireLe: new Date(maintenant.getTime() + DUREE_SESSION_MS),
    creeLe: maintenant,
  });
  return jeton;
}

/** Renvoie l'utilisateur de la session (et la prolonge), ou null si elle est inconnue ou expirée. */
export async function lireSession(base: Base, jeton: string, maintenant: Date): Promise<UtilisateurConnecte | null> {
  const id = empreinte(jeton);
  const [ligne] = await base
    .select({ expireLe: session.expireLe, utilisateurId: utilisateur.id, identifiant: utilisateur.identifiant })
    .from(session)
    .innerJoin(utilisateur, eq(session.utilisateurId, utilisateur.id))
    .where(eq(session.id, id));
  if (!ligne) return null;
  if (ligne.expireLe.getTime() <= maintenant.getTime()) {
    await base.delete(session).where(eq(session.id, id));
    return null;
  }
  const nouvelleExpiration = maintenant.getTime() + DUREE_SESSION_MS;
  if (nouvelleExpiration - ligne.expireLe.getTime() > DELAI_PROLONGATION_MS) {
    await base
      .update(session)
      .set({ expireLe: new Date(nouvelleExpiration) })
      .where(eq(session.id, id));
  }
  return { id: ligne.utilisateurId, identifiant: ligne.identifiant };
}

export async function supprimerSession(base: Base, jeton: string): Promise<void> {
  await base.delete(session).where(eq(session.id, empreinte(jeton)));
}

/** Ferme toutes les sessions d'un utilisateur, sauf éventuellement celle en cours. */
export async function supprimerSessionsUtilisateur(base: Base, utilisateurId: string, saufJeton?: string) {
  const condition =
    saufJeton === undefined
      ? eq(session.utilisateurId, utilisateurId)
      : and(eq(session.utilisateurId, utilisateurId), ne(session.id, empreinte(saufJeton)));
  await base.delete(session).where(condition);
}
