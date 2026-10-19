# ADR-0099 — Consignes de Claude : autonomie, questions et décisions

- **Date** : 19/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #217
- **Thème** : Méthode
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Le croisement des `.md` du 19/10/2026 (#217) a relevé des consignes contradictoires ou floues qui pouvaient faire
agir Claude sans demande : « push sans demander » (ADR-0002) contre « aucun push sans demande » (`CLAUDE.md`) ;
`/calibrer-vinted`, que Claude peut lancer seul, valait demande de fusionner ; « une issue à la fois » (`CLAUDE.md`)
contre « une PR pour plusieurs issues » (`/lot`) ; rien sur une simple question ni sur ce qu'est une décision ;
`/lot`, `/verifier` et `/version` renvoyés les uns aux autres alors que Claude ne peut pas les lancer.
Réponses de l'utilisateur du 19/10/2026 ; plan validé.

## Décision

| Sujet | Décision |
|---|---|
| « Oui » à « faut-il la réaliser maintenant ? » | **Jusqu'à la fusion** quand la CI est verte, comme `/lot` (choix de l'utilisateur) ; fusions sensibles exceptées. |
| `/calibrer-vinted` | Claude peut le démarrer seul à la réception d'un relevé, mais **demande avant de fusionner** (choix de l'utilisateur). Invoqué par l'utilisateur, il fusionne comme `/lot` (choix de Claude, *à relire*). |
| Plusieurs issues dans une PR | **Permis** pour de petites issues liées, si l'utilisateur l'accepte au cas par cas (choix de l'utilisateur). |
| Question, audit, conseil | Réponse directe, **sans issue** ni modification de fichier (plan validé). |
| Décision | Tout choix qui n'est écrit ni dans l'issue ni dans une réponse de l'utilisateur : ADR **Proposé** (« à relire ») ; seul l'utilisateur le fait passer **Accepté** (plan validé). |
| Skills réservés à l'utilisateur | `/lot`, `/verifier`, `/version` : quand une procédure y renvoie, Claude suit directement leur `SKILL.md` (plan validé). |
| Fusions sensibles | Une seule liste, dans `CLAUDE.md` (migration, `docker-compose*`, `Dockerfile`, `.github/`, `.claude/`) ; les skills y renvoient. |
| Vérification | `npm run verifier` n'affiche que la sortie des étapes en échec (`VERIFIER_DETAIL=1` : tout), pour que Claude lise moins de texte. |

## Conséquences

- `CLAUDE.md`, `.claude/skills/lot`, `calibrer-vinted`, `verifier`, `.claude/agents/relecteur.md` (texte de l'issue
  transmis par l'appelant) et `scripts/verifier.mjs` mis à jour ; version 1.19.3.
- ADR précisés : [ADR-0002](0002-git-manipulations-faites-par-claude.md) (push),
  [ADR-0038](0038-calibrage-de-l-extension-sous-agent-et-skill.md) (fusion de `/calibrer-vinted`),
  [ADR-0039](0039-lot-en-mode-issues-pr.md) (plusieurs issues par PR),
  [ADR-0081](0081-fusions-dans-main-par-claude-et-dependabot.md) (fusion après « oui »).
- Reste à faire par l'utilisateur (fichiers qu'il modifie seul), lignes fournies dans la PR :
  `.claude/settings.json` (fusion par l'outil GitHub de Claude en « demander », protection de
  `indicateurs-annexe.test.ts`) et `.claude/settings.local.json` du PC (retirer `Bash(python3 -I -)`).
