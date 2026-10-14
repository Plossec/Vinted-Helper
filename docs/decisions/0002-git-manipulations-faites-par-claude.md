# ADR-0002 — Git : manipulations faites par Claude

- **Date** : 05/10/2026
- **Statut** : Accepté · fusions précisées par [ADR-0046](0046-securite-du-depot-reglages-hooks-fusions.md) et [ADR-0081](0081-fusions-dans-main-par-claude-et-dependabot.md)
- **Décideurs** : utilisateur
- **Issue** : —
- **Thème** : Méthode

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : Claude effectue lui-même les manipulations Git (branches, commits, push, fusions, pull
requests) sans demander à l'utilisateur de lancer les commandes. Restent soumises aux interdictions de
`.claude/settings.json` (pas de réécriture d'historique, pas de `--force`, etc.). Limite technique : la session cloud ne
peut pas pousser de tags (refus réseau 403) ; les tags de version sont alors poussés depuis le PC.
