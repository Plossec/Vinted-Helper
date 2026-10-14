# ADR-0079 — Écran d'accueil « À faire »

- **Date** : 14/10/2026
- **Statut** : Accepté · réalisation précisée par [ADR-0089](0089-ecran-a-faire-realisation-et-ecran-d-ouverture.md)
- **Décideurs** : utilisateur
- **Issue** : #191
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : un écran unique regroupe tout ce qui demande l'attention de l'utilisateur, les
alertes actuelles (§5.8) comme les signalements des tâches automatisées.

| Sujet | Décision |
|---|---|
| Place | **Nouvel onglet d'accueil « À faire »**, 1er onglet, ouvert au démarrage, avec la **pastille** du nombre de choses à faire (elle quitte l'onglet Articles). Articles devient le 2e onglet (5 onglets en bas). Les puces d'alertes du haut de la liste Articles y sont reprises. |
| Organisation | **Par urgence** : « Urgent » (date limite d'envoi proche #151, publications en erreur, offres sans prix minimum #150) ; « À traiter » (à expédier, à récupérer, ventes à rattacher #148, actions à valider en mode manuel #147 à #151) ; « Pour info » (montants corrigés #148, invendus #147, dormants, brouillons anciens). |
| Actions | **Les deux** : boutons sur la ligne (Valider / Appliquer en mode manuel, Rattacher, Imprimer le bordereau, Ouvrir la conversation, Marquer envoyé…) **et** lien vers la fiche de l'article ou de la vente. |
| Disparition | Les choses à faire disparaissent seules une fois faites ; les signalements d'information se ferment par un bouton **« Vu »**. |
| Notifications | Aucune sur le téléphone (§10) : tout reste dans l'application. |
