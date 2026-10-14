# ADR-0050 — Graphique et API du tableau de bord après la revue de code

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #91, #96
- **Thème** : Tableau de bord

[← Index des décisions](README.md)

## Décision

- Graphique : le théorique est dessiné par un **contour plein** de 0 à sa valeur (contraste ≥ 3:1), avec une partie
  claire seulement là où il dépasse le réalisé vers le haut ; s'il tombe à l'intérieur de la barre réalisée
  (trésorerie négative qui remonte), un trait pointillé couleur du fond marque son niveau. Bulle, tableau et lecteur
  d'écran affichent le théorique dès qu'il diffère du réalisé.
- API : le total d'année du **réalisé** (`deLAnnee`) est gardé (§5.9, comparatif annuel envisagé) ; ceux du
  théorique et des ventes en cours, plus affichés depuis #88, sont retirés.
