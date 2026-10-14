# ADR-0030 — Filtres à choix multiples

- **Date** : 07/10/2026
- **Statut** : Accepté · statuts par défaut complétés par [ADR-0028](0028-statut-a-recuperer-apres-un-retour.md), [ADR-0037](0037-statut-erreur-de-publication.md), [ADR-0067](0067-statut-en-stock.md) et [ADR-0083](0083-filtres-a-vendre-hors-vinted-masque-par-defaut.md)
- **Décideurs** : utilisateur
- **Issue** : #30
- **Thème** : Liste

[← Index des décisions](README.md)

## Décision

- Statut, catégorie, marque, lieu et sortie acceptent plusieurs valeurs : un article est retenu s'il correspond à
  l'une des valeurs de chaque filtre ; une catégorie inclut ses sous-catégories ; aucun statut coché = tous.
- Statuts : puces à toucher ; autres filtres : recherche à la frappe, chaque choix devient une puce « × » (choix de
  l'utilisateur).
- Par défaut : tous les statuts sauf Finalisé et Sortie du stock ; « Effacer les filtres » y revient ; filtres gardés
  le temps de la session ; le compteur « Filtres (N) » ne compte pas ce réglage par défaut (choix de l'utilisateur).
- Sélection pour Vinted : proposée quand seul le statut « À publier » est coché.
