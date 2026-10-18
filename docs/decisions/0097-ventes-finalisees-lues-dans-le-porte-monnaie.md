# ADR-0097 — Ventes finalisées : lues dans le « Porte-monnaie »

- **Date** : 18/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #148
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

[ADR-0074](0074-tache-verification-vente-finalisee.md) prévoyait de lire « Mes commandes › Ventes », et
[ADR-0096](0096-ventes-finalisees-realisation-etape-1.md) en supposait l'adresse (`/my_orders/sold`). Au premier essai
de l'extension 1.11.0, l'utilisateur a indiqué la page à utiliser.

## Décision

| Sujet | Décision |
|---|---|
| Source | Le **« Porte-monnaie »** de Vinted : `https://www.vinted.fr/wallet/balance` (demande de l'utilisateur, 18/10/2026). |
| Reste | Inchangé : rattachement, finalisation à la date lue, montant Vinted, « à rattacher » ([ADR-0096](0096-ventes-finalisees-realisation-etape-1.md)). Les champs disponibles sur cette page (numéro de commande ou d'annonce, date, montant) seront confirmés par le relevé. |

## Conséquences

- Extension **1.11.1** : `selecteurs.js` (`pagePorteMonnaie`) ; libellés de l'application et guides mis à jour.
