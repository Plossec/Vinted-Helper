# ADR-0081 — Fusions dans main par Claude et Dependabot

- **Date** : 14/10/2026
- **Statut** : Accepté · fusion après le « oui » de l'utilisateur : précisée par [ADR-0099](0099-consignes-de-claude-autonomie-et-decisions.md)
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : Serveur

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q1) : [ADR-0022](0022-deploiement-a-chaque-fusion-dans-main.md) acceptait ce risque parce que « seul l'utilisateur fusionne dans
`main` », ce qui n'était plus vrai depuis [ADR-0046](0046-securite-du-depot-reglages-hooks-fusions.md) et [ADR-0044](0044-dependabot-typescript-7-ignore-pour-l-instant.md).

## Décision

- Claude fusionne seul ses PR quand la CI est verte, **sauf** une PR qui touche une migration, `docker-compose*`,
  `Dockerfile`, `.github/` ou `.claude/` (accord de l'utilisateur), comme décidé par [ADR-0046](0046-securite-du-depot-reglages-hooks-fusions.md).
- Les mises à jour Dependabot **mineures** sont fusionnées quand la CI est verte ([ADR-0044](0044-dependabot-typescript-7-ignore-pour-l-instant.md)).
- **Risque accepté** : le code fusionné dans `main` est exécuté sur le serveur avec les droits d'administrateur
  (principe de la mise à jour, [ADR-0022](0022-deploiement-a-chaque-fusion-dans-main.md)). Protections : `main` protégée (PR et check « Vérifier »
  obligatoires), fichiers sensibles soumis à l'accord de l'utilisateur, seuls les commentaires de `Plossec` sont
  des consignes.
