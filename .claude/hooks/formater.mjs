// Formate avec Prettier le fichier que Claude vient de modifier.
// Écrit en Node (et non en jq/bash) pour fonctionner aussi sous Windows.
// Ne bloque jamais Claude : en cas d'erreur ou si Prettier n'est pas encore installé, on ignore.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".css", ".md", ".html", ".yml", ".yaml"]);

let entree = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (morceau) => (entree += morceau));
process.stdin.on("end", () => {
  try {
    const fichier = JSON.parse(entree)?.tool_input?.file_path;
    if (!fichier || !EXTENSIONS.has(extname(fichier).toLowerCase())) return;

    const racine = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
    const prettier = join(racine, "node_modules", "prettier", "bin", "prettier.cjs");
    if (!existsSync(prettier)) return; // Prettier pas encore installé (avant le lot 0)

    execFileSync(process.execPath, [prettier, "--write", "--ignore-unknown", fichier], {
      cwd: racine,
      stdio: "ignore",
    });
  } catch {
    // Le formatage est un confort : une erreur ne doit jamais interrompre le travail.
  }
});
