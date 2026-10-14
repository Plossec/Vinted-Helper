# ADR-0089 — Écran « À faire » : réalisation et écran d'ouverture

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #191
- **Thème** : Interface

[← Index des décisions](README.md)

## Contexte

Réalisation de l'écran d'accueil « À faire » décidé dans [ADR-0079](0079-ecran-d-accueil-a-faire.md), avec les
alertes qui existent déjà (§5.8) ; les signalements des tâches automatisées (#147 à #151, #195, #196) s'y ajouteront
avec leurs issues. L'application installée s'ouvrait jusque-là sur « Terrain » (manifeste `start_url: /terrain`).

## Décision

| Sujet | Décision |
|---|---|
| Groupes et actions | **Urgent** : publications Vinted en erreur → **Republier** (retour dans la file, mode essai respecté). **À traiter** : à expédier → **Envoyé** (date du jour, tout le colis) et 💬 conversation ; à récupérer → **Récupéré → À publier** (choix de l'utilisateur). **Pour info** : dormants et brouillons anciens → **Vu**. Chaque ligne mène aussi à la fiche ; « Rien à faire » quand tout est fait. |
| « Vu » | Mémorisé **côté serveur** (table `signalement_vu`, migration 0016) avec la **date de départ** de l'alerte : une nouvelle date (article de nouveau dormant après une baisse de prix, retour en Brouillon) la fait réapparaître. La pastille ne compte pas les « Vu ». |
| Adresses | « À faire » en `/` ; la liste des articles en `/articles` (onglet « Articles », 2e) ; liens « ← Articles » vers `/articles`. |
| Écran d'ouverture | **Au choix dans les Réglages, par appareil** (choix de l'utilisateur) : *Terrain* (par défaut, comportement d'avant) ou *À faire*. Le manifeste ouvre `/demarrage`, qui redirige vers l'écran choisi. |

## Conséquences

- Les puces d'alertes du haut de la liste Articles disparaissent (reprises dans « À faire »).
- Une application déjà installée ne prend le nouveau manifeste (`/demarrage`) qu'après sa mise à jour par Android
  (ou une réinstallation) ; d'ici là, elle s'ouvre toujours sur Terrain.
- Guide d'utilisation et architecture (table `signalement_vu`) mis à jour ; version 1.15.0.
