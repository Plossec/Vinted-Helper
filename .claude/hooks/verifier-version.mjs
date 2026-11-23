// Hook Stop (#318) : en fin de tour, rappelle les règles de version, sans jamais bloquer.
// - Chaque PR porte sa version (CLAUDE.md) : code modifié par rapport à origin/main mais version de package.json
//   inchangée → avertissement ; version déjà présente dans le CHANGELOG d'origin/main (prise par une autre PR)
//   → avertissement.
// - Toute modification de l'extension augmente sa version (.claude/rules/extension-vinted.md) : outils/extension-vinted
//   modifié mais version de manifest.json inchangée → avertissement ; manifest.json et package.json de l'extension
//   avec des versions différentes → avertissement.
// - Rien sur main, ni sans origin/main (pas de réseau, clone sans branche distante).
// - Même avertissement qu'au passage précédent : rien n'est répété (empreinte en dossier temporaire).
// - Écrit en Node pour fonctionner pareil sous Windows et Linux.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const BASE = "origin/main";
const EXTENSION = "outils/extension-vinted/";

function git(args, racine) {
  try {
    return execFileSync("git", args, {
      cwd: racine,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

/** Version d'un package.json / manifest.json, dans l'arbre de travail (ref absente) ou sur une branche. */
function version(racine, chemin, ref = null) {
  try {
    const texte =
      ref === null
        ? readFileSync(join(racine, chemin), "utf8")
        : git(["show", `${ref}:${chemin}`], racine);
    return texte === null ? null : (JSON.parse(texte).version ?? null);
  } catch {
    return null;
  }
}

function lireEntree() {
  return new Promise((ok) => {
    let entree = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (m) => (entree += m));
    process.stdin.on("end", () => ok(entree));
  });
}

let donnees = {};
try {
  donnees = JSON.parse((await lireEntree()) || "{}");
} catch {
  process.exit(0); // entrée illisible : on ne bloque jamais sur une erreur du hook lui-même
}

const racine = resolve(
  process.env.CLAUDE_PROJECT_DIR ?? donnees.cwd ?? process.cwd(),
);
if (!existsSync(join(racine, "package.json"))) process.exit(0);
const branche = (
  git(["rev-parse", "--abbrev-ref", "HEAD"], racine) ?? ""
).trim();
if (branche === "" || branche === "main" || branche === "HEAD") process.exit(0);
if (git(["rev-parse", "--verify", "--quiet", BASE], racine) === null)
  process.exit(0);

// Fichiers modifiés : commits de la branche depuis origin/main, modifications non commitées, fichiers non suivis.
const chemins = new Set();
for (const c of (
  git(["diff", "--name-only", `${BASE}...HEAD`], racine) ?? ""
).split("\n"))
  if (c) chemins.add(c);
for (const ligne of (
  git(["status", "--porcelain", "--untracked-files=all"], racine) ?? ""
).split("\n")) {
  if (ligne.length > 3)
    chemins.add(
      ligne
        .slice(3)
        .split(" -> ")
        .pop()
        .replace(/^"|"$/g, "")
        .replace(/\\/g, "/"),
    );
}
const fichiers = [...chemins];
// « Code » : tout sauf la documentation (docs/, fichiers .md) et les fichiers de version eux-mêmes.
const VERSIONNES = new Set([
  "package.json",
  "package-lock.json",
  "client/package.json",
  "server/package.json",
]);
const code = fichiers.filter(
  (f) => !f.startsWith("docs/") && !f.endsWith(".md") && !VERSIONNES.has(f),
);
if (fichiers.length === 0) process.exit(0);

const avertissements = [];
const locale = version(racine, "package.json");
const surMain = version(racine, "package.json", BASE);
if (code.length > 0 && locale !== null && locale === surMain) {
  avertissements.push(
    `version de l'application inchangée (${locale}) alors que du code a changé : chaque PR porte sa version (procédure « version »).`,
  );
}
if (locale !== null && locale !== surMain) {
  const journal = git(["show", `${BASE}:CHANGELOG.md`], racine) ?? "";
  if (journal.includes(`## [${locale}]`)) {
    avertissements.push(
      `version ${locale} déjà prise sur main (CHANGELOG) : choisissez la suivante.`,
    );
  }
}

const extension = fichiers.filter(
  (f) => f.startsWith(EXTENSION) && !f.endsWith(".md"),
);
if (extension.length > 0) {
  const manifeste = version(racine, `${EXTENSION}manifest.json`);
  const paquet = version(racine, `${EXTENSION}package.json`);
  if (
    manifeste !== null &&
    manifeste === version(racine, `${EXTENSION}manifest.json`, BASE)
  ) {
    avertissements.push(
      `extension modifiée mais version de manifest.json inchangée (${manifeste}) : augmentez-la (.claude/rules/extension-vinted.md).`,
    );
  }
  if (manifeste !== null && paquet !== null && manifeste !== paquet) {
    avertissements.push(
      `extension : manifest.json (${manifeste}) et package.json (${paquet}) n'ont pas la même version.`,
    );
  }
}

// Rien à dire, ou même chose qu'au passage précédent : silence.
const fichierEmpreinte = join(
  tmpdir(),
  `vinted-helper-version-${createHash("sha256").update(racine).digest("hex").slice(0, 12)}.txt`,
);
const valeur = createHash("sha256")
  .update(avertissements.join("\n"))
  .digest("hex");
let precedente = null;
try {
  precedente = readFileSync(fichierEmpreinte, "utf8");
} catch {
  // Pas encore de passage enregistré.
}
try {
  writeFileSync(fichierEmpreinte, valeur);
} catch {
  // Dossier temporaire inaccessible : l'avertissement sera simplement répété.
}
if (avertissements.length === 0 || precedente === valeur) process.exit(0);

process.stdout.write(
  JSON.stringify({
    systemMessage: `⚠️ Versions (#318) : ${avertissements.join(" ")}`,
  }),
);
process.exit(0);