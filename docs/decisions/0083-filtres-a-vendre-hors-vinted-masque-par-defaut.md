# ADR-0083 — Filtres : « À vendre hors Vinted » masqué par défaut

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : Liste

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q7) : un article « À vendre hors Vinted » ([ADR-0066](0066-motif-de-sortie-a-vendre-hors-vinted.md)) reste en stock mais son statut est
Sortie du stock, décoché par défaut ([ADR-0030](0030-filtres-a-choix-multiples.md)).

## Décision

Les articles « À vendre hors Vinted » restent **masqués par défaut** dans la liste (statut Sortie du stock
décoché) : on les retrouve en cochant Sortie du stock. Aucun changement de code.
