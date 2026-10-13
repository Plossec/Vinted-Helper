// Hook PreToolUse (Bash, PowerShell) : refuse toute commande qui cite le fichier des secrets `.env` (issue #111).
// Les règles « Read(...) » ne protègent que l'outil de lecture : sans ce hook, `cat .env`, `Get-Content .env` ou
// `grep CLE .env` afficheraient les secrets.
// - Refusé : `.env`, `.env.local`, `.env.production` cités comme nom de fichier (seuls ou dans un chemin).
// - Permis : `.env.example` (valeurs fictives), `process.env`, `--env-file` sans `.env`, `env_file`…
// - Refus : code de sortie 2 + message sur stderr (Claude Code bloque la commande et montre le message).
// - Erreur du hook lui-même (entrée illisible) : on laisse passer (les autres garde-fous restent actifs).

const FICHIER_SECRET = /(^|[\s"'`=:<>|;&(,/\\])\.env(\.local|\.production)?(?=$|[\s"'`|;&)>,])/;

let entree = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (morceau) => (entree += morceau));
process.stdin.on("end", () => {
  let commande;
  try {
    commande = JSON.parse(entree)?.tool_input?.command;
  } catch {
    process.exit(0);
  }
  if (typeof commande !== "string" || !FICHIER_SECRET.test(commande)) process.exit(0);
  process.stderr.write(
    "Commande refusée : elle lit ou cite le fichier des secrets « .env », qui ne doit jamais être lu ni affiché " +
      "(CLAUDE.md, Garde-fous). Utilise « .env.example » pour connaître les variables attendues.",
  );
  process.exit(2);
});
