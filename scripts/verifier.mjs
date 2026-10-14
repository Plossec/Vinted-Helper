// Vérification complète du projet (#115) : les mêmes étapes pour la CI (`.github/workflows/deploiement.yml`) et pour
// `/verifier`. Toutes les étapes sont lancées, même après un échec, puis un résumé est affiché ; code de sortie 1
// si l'une échoue.
import { spawnSync } from "node:child_process";

const ETAPES = [
  ["Types", "npm run typecheck"],
  ["Lint", "npm run lint"],
  ["Format", "npm run format:check"],
  ["Tests", "npm test"],
  ["Construction", "npm run build"],
];

const resultats = ETAPES.map(([nom, commande]) => {
  console.log(`\n▶ ${nom} : ${commande}`);
  const debut = Date.now();
  const { status } = spawnSync(commande, { stdio: "inherit", shell: true });
  return { nom, ok: status === 0, secondes: Math.round((Date.now() - debut) / 1000) };
});

console.log("\nRésumé de la vérification");
for (const r of resultats) console.log(`${r.ok ? "✅" : "❌"} ${r.nom} (${r.secondes} s)`);
const echecs = resultats.filter((r) => !r.ok);
console.log(echecs.length === 0 ? "Tout est vert." : `${echecs.length} étape(s) en échec.`);
process.exit(echecs.length === 0 ? 0 : 1);
