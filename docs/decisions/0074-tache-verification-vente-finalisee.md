# ADR-0074 — Tâche « Vérification vente finalisée »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #148
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : la tâche ne fait qu'une chose : **commande terminée sur Vinted → article Finalisé**
dans l'application. La saisie des ventes, l'envoi et les retours restent manuels (#150 et #151 pourront y revenir).

| Sujet | Décision |
|---|---|
| Source | L'extension lit *Mes commandes › Ventes* sur Vinted. |
| Articles vérifiés | **Envoyé** seulement (seule transition existante vers Finalisé). |
| Rattachement | Commande Vinted ↔ article par le lien de l'annonce (`url_vinted`). Commande terminée sans article Envoyé retrouvé → liste **« à rattacher »** dans les alertes : l'utilisateur choisit l'article, le lien est enregistré, la tâche continue. |
| Vente groupée | Une commande de plusieurs articles = la vente groupée de l'application : tous les articles du colis passent Finalisé ensemble (règle existante, §4). |
| Date | **Date de fin de la commande lue sur Vinted** (le CA réalisé tombe dans le bon mois même si la tâche passe plus tard). |
| Montant | Si le montant crédité par Vinted diffère de celui de l'application : **le montant Vinted remplace** le montant crédité de la vente (réparti au prorata pour une vente groupée, §6.4) **et une alerte le signale** avec les deux montants. |
| Mode | **Automatique ou manuel**, au réglage du compte (comme #147) ; manuel = liste « changements détectés sur Vinted » à valider. |
| Rythme | Voir [ADR-0078](0078-rythme-des-taches-automatisees.md). |
| Alertes | Les nouvelles alertes (à rattacher, montant corrigé) iront dans l'écran d'accueil « À faire » proposé par l'utilisateur : #191. |
