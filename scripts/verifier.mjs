// Vérification complète du projet (#115) : les mêmes étapes pour la CI (`.github/workflows/deploiement.yml`) et pour
// `/verifier`. Toutes les étapes sont lancées, même après un échec, puis un résumé est affiché ; code de sortie 1
// si l'une échoue. Seule la sortie des étapes en échec est affichée (#217 : moins de texte à lire) ;
// `VERIFIER_DETAIL=1` affiche tout.
import { spawnSync } from "node:child_process";

/** Alertes de sécurité qui bloquent (#242, ADR-0107) : élevées et critiques ; les autres sont suivies chaque semaine. */
const NIVEAU_AUDIT = "high";

const ETAPES = [
  ["Types", "npm run typecheck"],
  ["Lint", "npm run lint"],
  ["Format", "npm run format:check"],
  ["Tests", "npm test"],
  ["Construction", "npm run build"],
  ["Audit", `npm audit --omit=dev --audit-level=${NIVEAU_AUDIT} --json`],
];
const DETAIL = process.env.VERIFIER_DETAIL === "1";

/**
 * Audit des dépendances embarquées en production (#242) : échec seulement pour une alerte élevée ou critique.
 * Sans réseau, le rapport est absent : simple avertissement sur le PC ; la CI, elle, échoue (elle a toujours le réseau).
 */
function lireAudit(stdout) {
  let rapport = null;
  try {
    rapport = JSON.parse(stdout);
  } catch {
    // Rapport illisible : traité comme un audit impossible.
  }
  const nombres = rapport?.metadata?.vulnerabilities;
  // En CI, le réseau est toujours là : un audit impossible est un échec, jamais un contrôle sauté en silence.
  if (!nombres) return { ok: process.env.CI !== "true", avertissement: "contrôle non lancé (pas de réseau ?)" };
  const bloquantes = (nombres.high ?? 0) + (nombres.critical ?? 0);
  const autres = (nombres.low ?? 0) + (nombres.moderate ?? 0);
  return {
    ok: bloquantes === 0,
    avertissement:
      bloquantes === 0 && autres > 0 ? `${autres} alerte(s) faible(s) ou modérée(s), non bloquante(s)` : null,
  };
}

const resultats = ETAPES.map(([nom, commande]) => {
  console.log(`▶ ${nom} : ${commande}`);
  const debut = Date.now();
  const { status, stdout, stderr } = spawnSync(commande, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const { ok, avertissement } = nom === "Audit" ? lireAudit(stdout ?? "") : { ok: status === 0, avertissement: null };
  if (!ok || DETAIL) process.stdout.write(`${stdout ?? ""}${stderr ?? ""}\n`);
  return { nom, ok, avertissement, secondes: Math.round((Date.now() - debut) / 1000) };
});

console.log("\nRésumé de la vérification");
for (const r of resultats) {
  const icone = !r.ok ? "❌" : r.avertissement ? "⚠️" : "✅";
  console.log(`${icone} ${r.nom} (${r.secondes} s)${r.avertissement ? ` : ${r.avertissement}` : ""}`);
}
const echecs = resultats.filter((r) => !r.ok);
console.log(echecs.length === 0 ? "Tout est vert." : `${echecs.length} étape(s) en échec.`);
process.exit(echecs.length === 0 ? 0 : 1);
