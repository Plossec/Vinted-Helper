# ADR-0124 — Offres aux favoris : toutes les notifications, délai depuis la publication, offre déjà faite

- **Date** : 22/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #295
- **Thème** : Tâches automatisées
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Premier passage de la tâche ([ADR-0123](0123-offres-aux-favoris-etape-2.md)), en essai, le 22/11/2026 : seules les
premières notifications étaient lues, et des offres étaient prévues pour des articles publiés le jour même. Relevé de
l'utilisateur du 22/11/2026 : une conversation avec une offre déjà faite (prix proposé, ancien prix barré, « offre
acceptée »).

## Décision

| Sujet | Décision |
|---|---|
| Notifications | L'extension fait **défiler la page** des notifications jusqu'en bas (nouvelles notifications chargées) avant de les lire, 500 au plus (choix de l'utilisateur ; limite : choix de Claude, *à relire*). |
| Délai | L'offre part **N jours après la publication** de l'article, et non plus N jours après le favori : dernière mise en ligne, ou dernière republication par la tâche « Articles dormants » (choix de l'utilisateur ; republication : choix de Claude, *à relire*). Remplace ce point d'[ADR-0114](0114-offres-aux-favoris-realisation.md) et d'[ADR-0123](0123-offres-aux-favoris-etape-2.md). |
| Offre déjà faite | Une offre déjà dans la conversation, **faite par l'acheteur ou par vous**, quel que soit son état, est comparée à l'offre prévue : plus chère → l'offre est faite ; au même prix ou moins chère → rien n'est envoyé, l'offre est annulée avec la raison (choix de l'utilisateur ; « quel que soit son état » et le prix le plus bas s'il y en a plusieurs : choix de Claude, *à relire*). |
| Offres déjà prévues | Elles suivent ces règles au moment de l'envoi (le délai et le prix sont vérifiés à chaque fois). |

## Conséquences

- Extension 1.18.0 ; résultat d'offre `inutile` (offre annulée avec la raison).
- ADR-0123 : marqué « modifié par ADR-0124 ».
