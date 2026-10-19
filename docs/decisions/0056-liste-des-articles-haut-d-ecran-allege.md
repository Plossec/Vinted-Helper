# ADR-0056 — Liste des articles : haut d'écran allégé

- **Date** : 13/10/2026
- **Statut** : Accepté · puces d'alertes retirées par [ADR-0089](0089-ecran-a-faire-realisation-et-ecran-d-ouverture.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : #100
- **Thème** : Interface

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : le choix d'affichage (vignettes, liste, mosaïque, détaillé) reste visible en
permanence, sur la ligne du nombre d'articles. Alertes en **rangée de puces** (compteur + libellé court) : la puce
touchée déplie sa liste dessous. Recherche et bouton « Filtres » sur une ligne ; le tri passe en tête du panneau des
filtres (choix de Claude, *à relire*). « + Nouvel article » devient un bouton rond flottant au-dessus de la barre,
masqué pendant la sélection pour Vinted. Mesuré à 360 px : premier article à 325 px du haut (≈ 660 avant), trois
articles visibles sans défiler.
