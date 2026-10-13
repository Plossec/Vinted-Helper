// Hook SessionStart : dans une session Claude dans le cloud (dépôt cloné à neuf), installe les dépendances si elles
// manquent, pour que les tests, le formatage et le hook du calcul marchent tout de suite (issue #112).
// - Uniquement si CLAUDE_CODE_REMOTE=true : sur le PC de l'utilisateur, rien ne change.
// - `npm ci` (lockfile) à la racine, puis dans outils/extension-vinted si son dossier node_modules manque.
// - Jamais bloquant : en cas d'échec, simple avertissement ; Claude peut relancer `npm ci` lui-même.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

if (process.env.CLAUDE_CODE_REMOTE !== "true") process.exit(0);

const racine = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const dossiers = [racine, join(racine, "outils", "extension-vinted")].filter(
  (d) => existsSync(join(d, "package-lock.json")) && !existsSync(join(d, "node_modules")),
);

const echecs = [];
for (const dossier of dossiers) {
  const r = spawnSync("npm ci --no-audit --no-fund", {
    cwd: dossier,
    shell: true,
    encoding: "utf8",
    timeout: 280_000,
    env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
  });
  if (r.status !== 0) echecs.push(dossier === racine ? "racine" : "outils/extension-vinted");
}

if (echecs.length > 0) {
  process.stdout.write(
    JSON.stringify({ systemMessage: `⚠️ npm ci a échoué (${echecs.join(", ")}) : relancez-le avant les tests.` }),
  );
}
process.exit(0);
