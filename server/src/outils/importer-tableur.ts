// Import de l'ancien tableur (fichier JSON préparé par Claude, jamais versionné) dans la base de l'application.
// Utilisation (serveur) : voir docs/guides/import-tableur.md
//   docker compose exec app npm run import-tableur -w server -- /tmp/import-tableur.json --essai   (vérification)
//   docker compose exec app npm run import-tableur -w server -- /tmp/import-tableur.json           (import réel)
// Tout est fait dans une seule transaction : en cas d'erreur (ou en mode essai), rien n'est enregistré.
import { readFileSync } from "node:fs";
import { creerConnexion } from "../base/connexion.js";
import { utilisateur } from "../base/schema.js";
import { importerTableur, lireDonneesImport } from "../import/tableur.js";

class AnnulationEssai extends Error {}

async function principal() {
  const args = process.argv.slice(2);
  const essai = args.includes("--essai");
  const fichier = args.find((a) => !a.startsWith("--"));
  if (!fichier) throw new Error("Indiquez le fichier à importer (ex. /tmp/import-tableur.json).");
  const donnees = lireDonneesImport(JSON.parse(readFileSync(fichier, "utf8")) as unknown);

  const connexion = creerConnexion();
  try {
    const comptes = await connexion.db.select({ id: utilisateur.id }).from(utilisateur);
    const compte = comptes[0];
    if (comptes.length !== 1 || !compte) throw new Error("Un seul compte attendu dans la base.");
    try {
      await connexion.db.transaction(async (tx) => {
        const bilan = await importerTableur(tx, compte.id, donnees, new Date());
        console.info(
          `${bilan.articles} articles (${bilan.lots} lots), ${bilan.sorties} sorties, ${bilan.ventes} ventes, ` +
            `${bilan.enLigne} en ligne, ${bilan.brouillons} brouillons.`,
        );
        if (essai) throw new AnnulationEssai();
      });
      console.info("Import terminé. Vérifiez le tableau de bord de l'application.");
    } catch (erreur) {
      if (!(erreur instanceof AnnulationEssai)) throw erreur;
      console.info("Mode essai : tout est correct, rien n'a été enregistré.");
    }
  } finally {
    await connexion.fermer();
  }
}

principal().catch((erreur: unknown) => {
  console.error(`Import impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  process.exitCode = 1;
});
