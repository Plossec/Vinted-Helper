// Premier démarrage : création du compte unique (identifiant et mot de passe du .env)
// et pré-remplissage des listes de référence à partir du tableur de l'utilisateur (décision du 05/10/2026).
import { count } from "drizzle-orm";
import { hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE } from "../compte/mot-de-passe.js";
import type { Base } from "./connexion.js";
import { categorie, etat, gamme, lieu, marque, utilisateur } from "./schema.js";

export const VALEURS_INITIALES = {
  lieux: [
    { nom: "Vide grenier", estMaison: false },
    { nom: "Maison", estMaison: true },
    { nom: "Ressourcerie", estMaison: false },
    { nom: "Bourse vêtement", estMaison: false },
    { nom: "LBC", estMaison: false },
  ],
  etats: ["Bon", "Abîmé", "Taché", "Cassé"],
  gammes: ["Marque+", "Marque", "Fast fashion", "Foot", "Rugby", "Vintage", "Luxe"],
  categories: [
    "Jean",
    "Chino",
    "Pantalon",
    "Cargo",
    "Jogging",
    "Short",
    "Ensemble",
    "T-shirt",
    "Polo",
    "Chemise",
    "Pull",
    "Pull zippé",
    "Veste",
    "Blouson",
    "Doudoune",
    "Manteau",
    "Maillot",
    "Casquette",
    "Bonnet",
    "Écharpe",
    "Lunettes",
    "Lunettes de soleil",
    "Boîte à lunettes",
    "Sac",
    "Pins",
    "Appareil photo",
    "Console",
    "Jeu de société",
    "Autre",
  ],
  marques: [
    "Levi's",
    "Nike",
    "Adidas",
    "Puma",
    "Lacoste",
    "Ralph Lauren",
    "Tommy Hilfiger",
    "Hugo Boss",
    "Fred Perry",
    "Carhartt",
    "Dickies",
    "Champion",
    "Dockers",
    "Columbia",
    "Lafuma",
    "Aigle",
    "Guess",
    "Eastpak",
    "Under Armour",
    "Vans",
    "Zara",
    "Pull&Bear",
    "Vuarnet",
    "Ray-Ban",
    "Gucci",
    "Dolce & Gabbana",
    "Pentax",
    "Olympus",
  ],
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
    const avecUtilisateur = (noms: string[]) => noms.map((nom) => ({ utilisateurId, nom }));

    await tx.insert(lieu).values(VALEURS_INITIALES.lieux.map((l) => ({ utilisateurId, ...l })));
    await tx.insert(etat).values(avecUtilisateur(VALEURS_INITIALES.etats));
    await tx.insert(gamme).values(avecUtilisateur(VALEURS_INITIALES.gammes));
    await tx.insert(categorie).values(avecUtilisateur(VALEURS_INITIALES.categories));
    await tx.insert(marque).values(avecUtilisateur(VALEURS_INITIALES.marques));
  });
  return true;
}
