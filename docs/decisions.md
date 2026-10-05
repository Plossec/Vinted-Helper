# Décisions prises en cours de développement

Complète `docs/cahier-des-charges.md`. En cas de contradiction, la décision la plus récente fait foi.
Format : date, sujet, décision, raison.

---

## 05/10/2026 — Outillage Claude : relecteur et hooks

**Décision**
- **Sous-agent `relecteur`** (`.claude/agents/relecteur.md`) : lecture seule (Read, Grep, Glob), lancé **uniquement à la
  demande de l'utilisateur** en fin de lot. Reçoit le numéro du lot et les fichiers modifiés depuis `main`. Compare au
  cahier des charges (§9, §8, §6, §10) et à `CLAUDE.md`. Rapport Bloquant / À corriger / Remarque, avec fichier, ligne,
  règle et correction proposée, puis la liste des critères d'acceptation couverts / non couverts. Ne corrige rien.
- **Hook `PostToolUse` → `formater.mjs`** (Edit, Write) : Prettier sur le fichier modifié, seulement `.ts`, `.tsx`, `.js`,
  `.json`, `.css`, seulement dans le dossier du projet (hors `node_modules`). Non bloquant. Sans effet tant que Prettier
  n'est pas installé dans le projet (lot 0).
- **Hook `Stop` → `tests-calculs.mjs`** :
  - ne fait rien si aucun fichier de `server/src/calculs/` n'est touché : modifications non commitées, fichiers non suivis,
    **et fichiers modifiés sur la branche par rapport à `main`** (option 2 retenue : un changement commité dans le même
    tour est aussi couvert) ;
  - sinon lance **uniquement** `npm test -w server -- calculs` (commande de `CLAUDE.md`) ; la suite complète reste le
    rôle de `/verifier` ;
  - en cas d'échec : code de sortie 2, rapport renvoyé à Claude, qui doit corriger avant de rendre la main ;
  - anti-boucle : si `stop_hook_active` est vrai, ne bloque plus ; si les tests échouent encore, affiche un avertissement
    à l'utilisateur (`systemMessage`).
- Scripts en **Node** (pas de bash ni de jq) pour fonctionner pareil sous Windows (Git Bash) et Linux. Node est installé
  sur le PC de l'utilisateur.

**Raison** : relecture indépendante en fin de lot ; formatage homogène sans y penser ; impossible de rendre la main avec
un module de calcul cassé.

**Installation** : `.claude/settings.json` et `.claude/hooks/` sont protégés en écriture contre Claude. Les scripts ont
été déposés dans `.claude/a-installer/` ; l'utilisateur les déplace dans `.claude/hooks/` et ajoute lui-même la section
`hooks` dans `settings.json`.

**Vérification** : les deux scripts ont été testés à la main sur un projet factice hors du dépôt (formatage d'un `.ts`,
`.md` et fichier hors projet ignorés, entrée invalide sans effet ; tests lancés uniquement quand le calcul est touché,
y compris après commit ; échec → code 2 ; `stop_hook_active` → avertissement sans blocage).
