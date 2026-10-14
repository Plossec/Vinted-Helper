# ADR-0085 — Code de catégorie construit sur le chemin

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : Socle

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q11), à propos de [ADR-0065](0065-categories-recopiees-de-vinted.md).

## Décision

Le code d'une catégorie reste construit à partir de son chemin (ex. `hommes/vetements/jeans/jeans-slim`) : pas
d'identifiant séparé. Si Vinted renomme une catégorie, une migration reprend les articles concernés.
