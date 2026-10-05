// Premier démarrage : création du compte unique (identifiant et mot de passe du .env)
// et pré-remplissage des lieux (tableur de l'utilisateur) et des marques courantes sur Vinted (décisions du 05/10/2026).
import { count } from "drizzle-orm";
import { hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE } from "../compte/mot-de-passe.js";
import type { Base } from "./connexion.js";
import { MARQUES_INITIALES } from "../catalogue/marques.js";
import { lieu, marque, utilisateur } from "./schema.js";

export const VALEURS_INITIALES = {
  lieux: [
    { nom: "Vide grenier", estMaison: false },
    { nom: "Maison", estMaison: true },
    { nom: "Ressourcerie", estMaison: false },
    { nom: "Bourse vêtement", estMaison: false },
    { nom: "LBC", estMaison: false },
  ],
  /** Catégories et états : listes fixes du catalogue (server/src/catalogue), pas de table à remplir. */
  marques: MARQUES_INITIALES,
};

export interface IdentifiantsInitiaux {
  identifiant: string;
  motDePasse: string;
}

/**
 * Crée le compte et ses listes de référence s'il n'existe encore aucun compte.
 * `lireIdentifiants` n'est appelé que dans ce cas (les variables du .env ne servent qu'au premier démarrage).
 */
export async function amorcerCompte(base: Base, lireIdentifiants: () => IdentifiantsInitiaux): Promise<boolean> {
  const [resultat] = await base.select({ nombre: count() }).from(utilisateur);
  if ((resultat?.nombre ?? 0) > 0) return false;

  const { identifiant, motDePasse } = lireIdentifiants();
  if (identifiant.trim() === "") throw new Error("COMPTE_IDENTIFIANT est vide dans le fichier .env.");
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw new Error(`COMPTE_MOT_DE_PASSE_INITIAL doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
  }
  const motDePasseHache = await hacherMotDePasse(motDePasse);

  await base.transaction(async (tx) => {
    const [cree] = await tx
      .insert(utilisateur)
      .values({ identifiant: identifiant.trim(), motDePasseHache })
      .returning({ id: utilisateur.id });
    if (!cree) throw new Error("Création du compte impossible.");
    const utilisateurId = cree.id;
    await tx.insert(lieu).values(VALEURS_INITIALES.lieux.map((l) => ({ utilisateurId, ...l })));
    await tx.insert(marque).values(VALEURS_INITIALES.marques.map((nom) => ({ utilisateurId, nom })));
  });
  return true;
}
