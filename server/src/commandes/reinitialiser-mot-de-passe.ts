// Commande de secours : réinitialise le mot de passe du compte et ferme toutes les sessions.
// Utilisation : docker compose exec -it app npm run reset-password -w server
import { createInterface } from "node:readline";
import { creerConnexion } from "../base/connexion.js";
import { utilisateur } from "../base/schema.js";
import { hacherMotDePasse, LONGUEUR_MIN_MOT_DE_PASSE } from "../compte/mot-de-passe.js";
import { supprimerSessionsUtilisateur } from "../compte/sessions.js";
import { eq } from "drizzle-orm";

/**
 * Sans terminal interactif (ex. « exec » sans -it, ou saisie envoyée par un tuyau), les lignes sont lues
 * par UNE seule interface partagée : sinon la première question absorberait toutes les lignes.
 */
let lignesNonInteractives: AsyncIterator<string> | null = null;

async function lireLigneNonInteractive(question: string): Promise<string> {
  process.stdout.write(question);
  lignesNonInteractives ??= createInterface({ input: process.stdin })[Symbol.asyncIterator]();
  const suivante = await lignesNonInteractives.next();
  process.stdout.write("\n");
  return suivante.done ? "" : suivante.value;
}

/** Lit une saisie sans l'afficher à l'écran (les caractères sont remplacés par des étoiles). */
function lireMasque(question: string): Promise<string> {
  if (!process.stdin.isTTY) return lireLigneNonInteractive(question);
  return new Promise((ok, echec) => {
    const entree = process.stdin;
    process.stdout.write(question);
    entree.setRawMode(true);
    entree.resume();
    entree.setEncoding("utf8");
    let saisie = "";
    const surTouche = (touche: string) => {
      for (const caractere of touche) {
        if (caractere === "\r" || caractere === "\n") {
          entree.setRawMode(false);
          entree.pause();
          entree.off("data", surTouche);
          process.stdout.write("\n");
          ok(saisie);
          return;
        }
        if (caractere === "\u0003") {
          entree.setRawMode(false);
          process.stdout.write("\n");
          echec(new Error("Annulé."));
          return;
        }
        if (caractere === "\u007f" || caractere === "\b") {
          if (saisie.length > 0) {
            saisie = saisie.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        saisie += caractere;
        process.stdout.write("*");
      }
    };
    entree.on("data", surTouche);
  });
}

const connexion = creerConnexion();
try {
  const comptes = await connexion.db
    .select({ id: utilisateur.id, identifiant: utilisateur.identifiant })
    .from(utilisateur);
  const compte = comptes[0];
  if (!compte) {
    console.error("Aucun compte n'existe encore : démarrez l'application une première fois.");
    process.exitCode = 1;
  } else {
    console.info(`Réinitialisation du mot de passe du compte « ${compte.identifiant} ».`);
    const nouveau = await lireMasque(`Nouveau mot de passe (${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum) : `);
    const confirmation = await lireMasque("Confirmez le nouveau mot de passe : ");
    if (nouveau.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      console.error(`Mot de passe trop court (${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum). Rien n'a été modifié.`);
      process.exitCode = 1;
    } else if (nouveau !== confirmation) {
      console.error("Les deux saisies sont différentes. Rien n'a été modifié.");
      process.exitCode = 1;
    } else {
      await connexion.db
        .update(utilisateur)
        .set({ motDePasseHache: await hacherMotDePasse(nouveau) })
        .where(eq(utilisateur.id, compte.id));
      await supprimerSessionsUtilisateur(connexion.db, compte.id);
      console.info("Mot de passe modifié. Toutes les sessions ont été fermées : reconnectez-vous.");
    }
  }
} catch (erreur) {
  console.error("Échec :", erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
} finally {
  await connexion.fermer();
  // Quitte même si une lecture du clavier est restée ouverte.
  process.exit(process.exitCode ?? 0);
}
