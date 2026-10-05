// Hook PostToolUse (Edit, Write) : formate avec Prettier le fichier que Claude vient de modifier.
// - Uniquement .ts, .tsx, .js, .json, .css, et uniquement dans le dossier du projet.
// - Écrit en Node (pas de bash ni de jq) pour fonctionner pareil sous Windows et Linux.
// - Non bloquant : quoi qu'il arrive (Prettier absent, erreur de syntaxe…), on sort avec le code 0.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".json", ".css"]);

let entree = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (morceau) => (entree += morceau));
process.stdin.on("end", () => {
  try {
    const donnees = JSON.parse(entree);
    const fichierBrut = donnees?.tool_input?.file_path;
    if (typeof fichierBrut !== "string" || !EXTENSIONS.has(extname(fichierBrut).toLowerCase())) return;

    const racine = resolve(process.env.CLAUDE_PROJECT_DIR ?? donnees.cwd ?? process.cwd());
    const fichier = resolve(racine, fichierBrut);

    // Uniquement dans le dossier du projet (et jamais dans node_modules).
    const relatif = relative(racine, fichier);
    if (relatif === "" || relatif.startsWith("..") || isAbsolute(relatif)) return;
    if (relatif.split(/[\\/]/).includes("node_modules")) return;
    if (!existsSync(fichier)) return;

    // Prettier du projet (installé par `npm ci` au lot 0). Absent : on ne fait rien.
    const prettier = join(racine, "node_modules", "prettier", "bin", "prettier.cjs");
    if (!existsSync(prettier)) return;

    execFileSync(process.execPath, [prettier, "--write", "--log-level", "warn", fichier], {
      cwd: racine,
      stdio: "ignore",
      timeout: 25_000,
    });
  } catch {
    // Le formatage est un confort : une erreur ne doit jamais interrompre le travail.
  }
});
