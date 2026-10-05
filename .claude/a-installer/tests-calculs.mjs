// Hook Stop : en fin de tour, relance les tests du module de calcul s'il a été touché.
// - Fichiers concernés : server/src/calculs/** modifiés non commités, non suivis,
//   ou modifiés sur la branche par rapport à main (commits du lot).
// - Lance UNIQUEMENT les tests du calcul (commande documentée dans CLAUDE.md), jamais toute la suite.
// - Échec : code de sortie 2 + rapport sur stderr → Claude doit corriger avant de rendre la main.
// - Anti-boucle : si stop_hook_active est vrai (Claude continue déjà à cause de ce hook), on ne bloque plus ;
//   si les tests échouent encore, on affiche seulement un avertissement à l'utilisateur.
// - Écrit en Node pour fonctionner pareil sous Windows et Linux.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const DOSSIER_CALCULS = "server/src/calculs/";
const COMMANDE_TESTS = "npm test -w server -- calculs"; // identique à CLAUDE.md
const LIGNES_RAPPORT = 60;

function git(args, racine) {
  try {
    return execFileSync("git", args, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function fichiersCalculsTouches(racine) {
  const chemins = new Set();

  // 1. Modifications non commitées et fichiers non suivis.
  const statut = git(["status", "--porcelain", "--untracked-files=all"], racine) ?? "";
  for (const ligne of statut.split("\n")) {
    if (ligne.length < 4) continue;
    const chemin = ligne.slice(3).split(" -> ").pop().replace(/^"|"$/g, "");
    chemins.add(chemin);
  }

  // 2. Fichiers modifiés sur la branche depuis main (commits faits pendant le lot).
  if (git(["rev-parse", "--verify", "--quiet", "main"], racine) !== null) {
    const diff = git(["diff", "--name-only", "main...HEAD"], racine) ?? "";
    for (const chemin of diff.split("\n")) if (chemin) chemins.add(chemin);
  }

  return [...chemins].filter((c) => c.replace(/\\/g, "/").startsWith(DOSSIER_CALCULS));
}

function lireEntree() {
  return new Promise((ok) => {
    let entree = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (m) => (entree += m));
    process.stdin.on("end", () => ok(entree));
  });
}

const entree = await lireEntree();
let donnees = {};
try {
  donnees = JSON.parse(entree || "{}");
} catch {
  process.exit(0); // entrée illisible : on ne bloque jamais sur une erreur du hook lui-même
}

const racine = resolve(process.env.CLAUDE_PROJECT_DIR ?? donnees.cwd ?? process.cwd());

// Projet pas encore créé (avant le lot 0) : rien à tester.
if (!existsSync(join(racine, "package.json")) || !existsSync(join(racine, "server", "package.json"))) process.exit(0);

const touches = fichiersCalculsTouches(racine);
if (touches.length === 0) process.exit(0);

const resultat = spawnSync(COMMANDE_TESTS, {
  cwd: racine,
  shell: true, // npm est un script .cmd sous Windows : il faut passer par le shell
  encoding: "utf8",
  timeout: 110_000,
  env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
});

if (resultat.status === 0) process.exit(0);

const sortie = `${resultat.stdout ?? ""}\n${resultat.stderr ?? ""}`.trim().split("\n");
const extrait = sortie.slice(-LIGNES_RAPPORT).join("\n");
const cause = resultat.error ? `Erreur de lancement : ${resultat.error.message}` : `Code de sortie : ${resultat.status}`;

if (donnees.stop_hook_active === true) {
  // Déjà relancé une fois par ce hook : on laisse finir le tour, mais l'utilisateur est prévenu.
  process.stdout.write(
    JSON.stringify({
      systemMessage: `⚠️ Tests du calcul toujours en échec (${COMMANDE_TESTS}). Fichiers concernés : ${touches.join(", ")}`,
    }),
  );
  process.exit(0);
}

process.stderr.write(
  [
    `Les tests du module de calcul échouent (${COMMANDE_TESTS}). ${cause}.`,
    `Fichiers du calcul modifiés : ${touches.join(", ")}`,
    "Corrige le code avant de rendre la main. Ne modifie jamais un test de l'annexe §11 pour le faire passer :",
    "si un résultat attendu te semble faux, signale-le à l'utilisateur.",
    "",
    `--- ${LIGNES_RAPPORT} dernières lignes du rapport de tests ---`,
    extrait,
  ].join("\n"),
);
process.exit(2);
