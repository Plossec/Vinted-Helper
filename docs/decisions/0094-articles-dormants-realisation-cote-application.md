# ADR-0094 — Articles dormants : réalisation côté application (étape 1 sur 3)

- **Date** : 15/10/2026
- **Statut** : Accepté
- **Décideurs** : Claude, dans le cadre validé par l'utilisateur ([ADR-0072](0072-taches-automatisees-socle-commun.md), [ADR-0073](0073-tache-articles-dormants.md), [ADR-0078](0078-rythme-des-taches-automatisees.md))
- **Issue** : #147
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

[ADR-0073](0073-tache-articles-dormants.md) prévoyait une PR 1 (application et extension en mode essai) puis une
PR 2 (calibrage). Pour limiter le risque, la PR 1 est découpée : l'application d'abord, l'extension ensuite.

## Décision

| Sujet | Décision |
|---|---|
| Livraison | **1.** Application (cette étape) : réglages, calcul, statut Invendu, file d'actions, liste à valider, journal. **2.** Extension : exécution des actions en mode essai, relevé des pages « Modifier » et « Supprimer » au Diagnostic, pauses entre deux actions. **3.** Calibrage d'après le relevé, passage au mode réel. |
| Calcul | `server/src/calculs/baisse.ts` (règle n° 1), conforme à ADR-0073 : arrondi vers le haut au 0,50 €, −0,50 € si l'arrondi redonne le prix, plancher au prix vente minimum, sinon republication. |
| Planification | Au **passage de l'extension** (appel toutes les 5 minutes) : tâche activée, dans la plage horaire (8 h – 22 h, Paris), à sa fréquence (24 h par défaut, 6 h au moins). Une action par article dormant, dans les plafonds du jour ; aucune nouvelle action pour un article qui en a déjà une en cours ; articles sans lien d'annonce ignorés. |
| Mode par défaut | **Manuel** (liste à valider), choix le plus prudent ; tâche **désactivée** par défaut. |
| Liste à valider | En tête de l'écran **« À faire »** (cocher, « Appliquer » ou « Refuser »), avec la pastille. |
| Journal | Écran **« Publication Vinted »**, sous la file de publication. |
| Actions périmées | Une action prévue est **annulée** si l'article n'est plus En ligne, a changé de prix à la main ou est à la corbeille. |
| Mode essai | Réglage commun aux tâches, **coché par défaut** jusqu'au calibrage (étape 3) : l'extension ouvrira les pages sans rien modifier. |
| Invendu | Statut atteint seulement par la tâche (au passage qui suit la 3e republication faite, hors essai, depuis la dernière arrivée En ligne). Transitions : À expédier (vendu), En ligne (la tâche reprend), À publier, Sortie du stock. Alerte « Invendus » dans « À faire » (À traiter, bouton « Remettre en ligne »). |
| Délai dormant | Une republication faite relance le délai, comme une baisse de prix. |
| Pauses | Réglées dès maintenant (baisse 2 min, republication 10 min), appliquées par le serveur quand il confie les actions à l'extension (étape 2). |
| Tests | Préparation des tests portée à 30 s (`hookTimeout`) : le premier test de chaque fichier rejoue toutes les migrations et dépassait parfois 10 s. |

## Conséquences

- Migration `0018_taches_dormants` (ajouts seulement) ; cahier des charges §4.1, §4.2 et §5.8 : statut Invendu.
- Tant que l'étape 2 n'est pas livrée, les actions validées restent « En attente de l'extension ».
