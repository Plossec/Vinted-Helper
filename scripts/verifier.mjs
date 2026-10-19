// Vérification complète du projet (#115) : les mêmes étapes pour la CI (`.github/workflows/deploiement.yml`) et pour
// `/verifier`. Toutes les étapes sont lancées, même après un échec, puis un résumé est affiché ; code de sortie 1
// si l'une échoue. Seule la sortie des étapes en échec est affichée (#217 : moins de texte à lire) ;
// `VERIFIER_DETAIL=1` affiche tout.
import { spawnSync } from "node:child_process";

const ETAPES = [
  ["Types", "npm run typecheck"],
  ["Lint", "npm run lint"],
  ["Format", "npm run format:check"],
  ["Tests", "npm test"],
  ["Construction", "npm run build"],
];
const DETAIL = process.env.VERIFIER_DETAIL === "1";

const resultats = ETAPES.map(([nom, commande]) => {
  console.log(`▶ ${nom} : ${commande}`);
  const debut = Date.now();
  const { status, stdout, stderr } = spawnSync(commande, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const ok = status === 0;
  if (!ok || DETAIL) process.stdout.write(`${stdout ?? ""}${stderr ?? ""}\n`);
  return { nom, ok, secondes: Math.round((Date.now() - debut) / 1000) };
});

console.log("\nRésumé de la vérification");
for (const r of resultats) console.log(`${r.ok ? "✅" : "❌"} ${r.nom} (${r.secondes} s)`);
const echecs = resultats.filter((r) => !r.ok);
console.log(echecs.length === 0 ? "Tout est vert." : `${echecs.length} étape(s) en échec.`);
process.exit(echecs.length === 0 ? 0 : 1);
