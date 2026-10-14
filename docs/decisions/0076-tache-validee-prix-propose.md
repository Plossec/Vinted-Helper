# ADR-0076 — Tâche « Validée prix proposé »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #150
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : la tâche répond aux **offres reçues** des acheteurs et **crée la vente** quand une offre
(reçue, ou envoyée par #149) est acceptée et payée.

| Sujet | Décision |
|---|---|
| Offre ≥ prix vente minimum | **Acceptée si l'article est dormant depuis au moins X jours** (X réglable dans les réglages du compte), comptés **comme l'alerte dormant** : depuis la dernière baisse de prix ou la mise en ligne. Moins de X jours → **contre-offre à mi-chemin**. |
| Offre < prix vente minimum | **Contre-offre à mi-chemin** entre l'offre et le prix affiché, arrondie vers le haut au 0,50 €, jamais sous le minimum. |
| Sans prix vente minimum | **Rien sur Vinted**, l'offre est **signalée dans l'application** (écran « À faire », #191). |
| Offre acceptée et payée | **La vente est créée** : article *À expédier*, prix vendu = prix accepté, date de vente = date du paiement lue sur Vinted, lien de la conversation enregistré. Offre groupée (plusieurs articles) → vente groupée, montant réparti au prorata (§6.4). Vaut aussi pour les offres envoyées par #149. |
| Mode | **Automatique ou manuel**, au réglage du compte ; manuel = liste des réponses prévues (accepter, contre-offre) à valider. |
| Rythme | Voir [ADR-0078](0078-rythme-des-taches-automatisees.md). |
