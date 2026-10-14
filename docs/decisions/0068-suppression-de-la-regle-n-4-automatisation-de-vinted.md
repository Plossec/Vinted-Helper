# ADR-0068 — Suppression de la règle n° 4 (automatisation de Vinted)

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #185
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

- 14/10/2026 (#185, demande de l'utilisateur) : la **règle n° 4** de `CLAUDE.md` (seule automatisation autorisée : la
  publication par l'extension ; Claude ne consulte jamais Vinted) est **supprimée entièrement**, pour récupérer les
  libellés réels des catégories (#177) et permettre les tâches automatisées (#147 à #151). L'interdiction
  `WebFetch` vers vinted.fr / vinted.com reste dans `.claude/settings.json` tant que l'utilisateur ne l'a pas retirée
  (fichier qu'il est seul à modifier). Les risques déjà acceptés (CGU de Vinted : suspension possible du compte)
  valent pour toute nouvelle automatisation.

## Suites

L'interdiction `WebFetch` vers vinted.fr / vinted.com a ensuite été retirée de `.claude/settings.json` par
l'utilisateur le même jour (PR #187) : c'est ce qui a permis à Claude de lire vinted.fr pour #177.
