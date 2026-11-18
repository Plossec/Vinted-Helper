// Retire les métadonnées (position GPS, modèle du téléphone…) des photos enregistrées avant l'issue #216.
// Utilisation (serveur, voir docs/guides/mise-en-ligne-ovh.md) :
//   docker compose exec app npm run photos:sans-metadonnees -w server              (essai : rien n'est modifié)
//   docker compose exec app npm run photos:sans-metadonnees -w server -- --appliquer
import { creerConnexion } from "../base/connexion.js";
import { config } from "../config.js";
import { retirerMetadonneesDesPhotos } from "../photos/service.js";
import { creerStockagePhotos } from "../photos/stockage.js";

async function principal() {
  const essai = !process.argv.slice(2).includes("--appliquer");
  const connexion = creerConnexion();
  try {
    const bilan = await retirerMetadonneesDesPhotos(connexion.db, creerStockagePhotos(config.dossierPhotos), essai);
    console.info(`${bilan.verifiees} photo(s) vérifiée(s), ${bilan.aNettoyer} avec des métadonnées.`);
    if (bilan.illisibles > 0) console.info(`${bilan.illisibles} fichier(s) introuvable(s) ou illisible(s), ignoré(s).`);
    console.info(
      essai
        ? "Mode essai : rien n'a été modifié. Relancez avec « -- --appliquer » pour nettoyer."
        : `${bilan.nettoyees} photo(s) nettoyée(s).`,
    );
  } finally {
    await connexion.fermer();
  }
}

principal().catch((erreur: unknown) => {
  console.error(`Nettoyage impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  process.exitCode = 1;
});
