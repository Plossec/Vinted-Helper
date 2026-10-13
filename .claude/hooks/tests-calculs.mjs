// Hook Stop : en fin de tour, relance les tests du module de calcul s'il a été touché.
// - Fichiers concernés : server/src/calculs/** modifiés non commités, non suivis,
//   ou modifiés sur la branche par rapport à main (ou origin/main dans une session cloud).
// - Ne relance pas si ces fichiers n'ont pas changé depuis le dernier passage réussi (empreinte en dossier temporaire).
// - Dépendances absentes (vitest introuvable, ex. session cloud sans npm ci) : avertissement, jamais de blocage
//   (issue #112).
// - Lance UNIQUEMENT les tests du calcul (commande documentée dans CLAUDE.md), jamais toute la suite.
// - Échec : code de sortie 2 + rapport sur stderr → Claude doit corriger avant de rendre la main.
// - Anti-boucle : si stop_hook_active est vrai (Claude continue déjà à cause de ce hook), on ne bloque plus ;
//   si les tests échouent encore, on affiche seulement un avertissement à l'utilisateur.
// - Écrit en Node pour fonctionner pareil sous Windows et Linux.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

  // 2. Fichiers modifiés sur la branche depuis main (ou origin/main : clone sans branche main locale).
  const base = ["main", "origin/main"].find((b) => git(["rev-parse", "--verify", "--quiet", b], racine) !== null);
  if (base !== undefined) {
    const diff = git(["diff", "--name-only", `${base}...HEAD`], racine) ?? "";
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

// Dépendances absentes : impossible de tester, mais ce n'est pas une erreur du code.
if (!["server", "."].some((d) => existsSync(join(racine, d, "node_modules", ".bin", "vitest")))) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `⚠️ Tests du calcul non lancés : dépendances absentes (lancez « npm ci »). Fichiers : ${touches.join(", ")}`,
    }),
  );
  process.exit(0);
}

// Même contenu qu'au dernier passage réussi : inutile de relancer.
const empreinte = createHash("sha256");
for (const chemin of [...touches].sort()) {
  empreinte.update(chemin);
  if (existsSync(join(racine, chemin))) empreinte.update(readFileSync(join(racine, chemin)));
}
const valeur = empreinte.digest("hex");
const fichierEmpreinte = join(
  tmpdir(),
  `vinted-helper-calculs-${createHash("sha256").update(racine).digest("hex").slice(0, 12)}.txt`,
);
const lireEmpreinte = () => {
  try {
    return readFileSync(fichierEmpreinte, "utf8");
  } catch {
    return null;
  }
};
if (lireEmpreinte() === valeur) process.exit(0);

const resultat = spawnSync(COMMANDE_TESTS, {
  cwd: racine,
  shell: true, // npm est un script .cmd sous Windows : il faut passer par le shell
  encoding: "utf8",
  timeout: 110_000,
  env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
});

if (resultat.status === 0) {
  try {
    writeFileSync(fichierEmpreinte, valeur);
  } catch {
    // Dossier temporaire inaccessible : les tests seront simplement relancés au prochain tour.
  }
  process.exit(0);
}

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
