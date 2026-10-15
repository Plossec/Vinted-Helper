# ADR-0048 — Prix vente minimum

- **Date** : 13/10/2026
- **Statut** : Accepté · verrou dans la base : voir [ADR-0091](0091-verrou-prix-minimum-dans-la-base.md)
- **Décideurs** : utilisateur
- **Issue** : #146
- **Thème** : Socle

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : champ facultatif « Prix vente minimum (€) » sur chaque article, sous « Prix affiché sur
Vinted (€) », dans la fiche seulement. **Information seule pour l'instant** (aucun calcul) ; il servira aux tâches
automatisées de négociation (#149, #150). Vide = pas de minimum. Refusé s'il dépasse le prix affiché, à
l'enregistrement de la fiche comme au passage En ligne avec un nouveau prix. Colonne `prix_vente_minimum`
(centimes), migration `0010_prix_vente_minimum` (ajout d'une colonne vide, sans effet sur les données existantes).
