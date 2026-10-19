# ADR-0003 — Travail autonome sur les lots 2 à 7

- **Date** : 05/10/2026
- **Statut** : Accepté · ponctuel (nuit du 05 au 06/10/2026), puis [ADR-0039](0039-lot-en-mode-issues-pr.md) ; tags poussés depuis le PC : remplacé par [ADR-0045](0045-une-version-par-pr-tag-automatique.md)
- **Décideurs** : utilisateur
- **Issue** : —
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : Claude enchaîne les lots 2 à 7 sans validation intermédiaire (« d'ici demain »), en mode
Auto, y compris pour Git (checkout…), npm, Docker et les commandes Windows (hors interdictions de `.claude/settings.json`).
Les points flous sont **tranchés par Claude et notés ici** (marqués « *à relire* ») ; chaque lot est livré par
une pull request fusionnée dans `main` dès que les vérifications sont vertes. Remplace, pour cette nuit, la règle « un
lot validé sur le téléphone avant le suivant ». Les tags de version restent à pousser depuis le PC.
