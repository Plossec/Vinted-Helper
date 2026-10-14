# ADR-0077 — Tâche « Récupération du bon de livraison »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #151
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : pour chaque article **« À expédier »** (vente saisie à la main ou créée par #150), la
tâche récupère sur Vinted de quoi expédier le colis.

| Sujet | Décision |
|---|---|
| Déclencheur | Article *À expédier* dans l'application, quelle que soit l'origine de la vente (#148 ne crée pas de vente). |
| Récupéré | **Bordereau (PDF)**, **QR code / code de dépôt** (transporteurs sans impression), **numéro de suivi** (avec le transporteur), **date limite d'envoi**. |
| Usage | **Les deux** : impression groupée sur le PC (tous les bordereaux des *À expédier* en un seul PDF) et affichage du bordereau ou du QR code sur la fiche de la vente, au téléphone. |
| Date limite | Alerte dans l'écran « À faire » (#191) quand elle approche. |
| Mode | **Automatique ou manuel**, au réglage du compte. |
| Rythme | Voir [ADR-0078](0078-rythme-des-taches-automatisees.md). |
