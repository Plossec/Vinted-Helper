# ADR-0096 — Vérification vente finalisée : réalisation, étape 1 sur 2

- **Date** : 16/10/2026
- **Statut** : Accepté · page lue : voir [ADR-0097](0097-ventes-finalisees-lues-dans-le-porte-monnaie.md)
- **Décideurs** : Claude, dans le cadre validé par l'utilisateur ([ADR-0074](0074-tache-verification-vente-finalisee.md), [ADR-0078](0078-rythme-des-taches-automatisees.md))
- **Issue** : #148
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

La page Vinted « Mes commandes › Ventes » n'a jamais été relevée : sa structure (et celle des commandes) est inconnue.
Comme pour #147 ([ADR-0094](0094-articles-dormants-realisation-cote-application.md)), l'application est livrée
d'abord, l'extension ne faisant qu'ouvrir et relever la page.

## Décision

| Sujet | Décision |
|---|---|
| Livraison | **1.** (cette étape) Application complète + extension 1.11 qui ouvre et relève la page des ventes (essai). **2.** Calibrage d'après le relevé : l'extension lit les commandes terminées et les envoie. |
| Réglages | Tâche **désactivée** par défaut, mode **manuel** par défaut, lecture **toutes les 24 h** (6 h au moins), **50 finalisations par jour** sans validation (100 au plus ; au-delà, à valider), pause de 1 min entre deux pages (pour l'étape 2). Plage horaire et mode essai communs aux tâches. |
| Lecture | Demandée à l'extension au passage qui suit la fréquence ; ordre : publication, lecture des commandes, actions des articles dormants (une opération sur Vinted par passage). La date de lecture est celle du résultat reçu. |
| Commande | Identifiant Vinted, numéros des annonces, date de fin, montant crédité (facultatif). Une commande n'est **jamais traitée deux fois**. En mode essai (réglages ou extension), rien n'est enregistré. |
| Rattachement | Par le **numéro de l'annonce** (`/items/123`) des articles **Envoyé**. Le colis de l'application doit contenir **exactement** les articles de la commande ; sinon « à rattacher », avec la raison. |
| Finalisation | Tout le colis passe Finalisé à la **date de fin Vinted** ; montant Vinted différent → il **remplace** le montant crédité (réparti par le module de calcul) et l'ancien est gardé pour l'alerte « montant corrigé ». Une finalisation impossible (colis déjà finalisé, date dans le futur) laisse la commande à valider, avec la raison. |
| À faire | « Ventes finalisées sur Vinted : à valider » (cocher, Finaliser / Refuser), « Commandes Vinted à rattacher » (choisir l'article Envoyé : le lien de l'annonce lui est enregistré, puis le colis est finalisé ; ou Ignorer), « Montants corrigés par Vinted » (Vu). |
| Page des ventes | Adresse probable `/my_orders/sold` (`selecteurs.js`), à confirmer par le relevé. |

## Conséquences

- Migration `0019_taches_finalisation` (ajouts seulement).
- L'issue reste ouverte jusqu'à l'étape 2.
