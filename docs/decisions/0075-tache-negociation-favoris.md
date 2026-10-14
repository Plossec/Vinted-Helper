# ADR-0075 — Tâche « Négociation favoris »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #149
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : la tâche envoie une **offre réduite** aux personnes qui ont mis un article en favori sans
l'acheter. La plus risquée vis-à-vis de Vinted (envoi vers des tiers) : réalisée en dernier.

| Sujet | Décision |
|---|---|
| Déclencheur | **N jours après le favori** sans achat (N réglable dans les réglages du compte). |
| Remise | **Règle de baisse de #147** : % ou montant (réglage de l'article, sinon du compte ; « ne pas baisser » → pas d'offre), arrondi vers le haut au 0,50 €, jamais sous le prix vente minimum. |
| Sans prix vente minimum | **Pas d'offre.** |
| Message | **Aucun** : l'offre seule (pas de texte répétitif). |
| Répétition | **Une seule offre** par personne et par article, jamais de relance. |
| Mode | **Automatique ou manuel**, au réglage du compte ; manuel = liste des offres prévues à valider. |
| Offre acceptée | Traitée par **#150** (pas par cette tâche). |
| Rythme | Voir [ADR-0078](0078-rythme-des-taches-automatisees.md). |
