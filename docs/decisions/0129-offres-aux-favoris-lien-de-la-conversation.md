# ADR-0129 — Offres aux favoris : lien de la conversation gardé dès la lecture

- **Date** : 23/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #326
- **Thème** : Tâches automatisées
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Journal du 23/11/2026 : toutes les offres échouaient (« Notification du favori introuvable »). L'offre part au moins
N jours après la publication ([ADR-0124](0124-offres-aux-favoris-delai-et-offre-existante.md)) ; d'ici là, la
notification n'est plus chargée dans la liste et l'extension ne la retrouve pas.

## Décision

| Sujet | Décision |
|---|---|
| Lien gardé | À la lecture, le lien de la notification (conversation où « Faire une offre » s'ouvre) est enregistré avec l'offre ; l'offre l'ouvre directement (choix de l'utilisateur). |
| Contrôle | Seule une adresse https de Vinted est gardée ; sinon le lien est ignoré (recherche dans les notifications en secours) (choix de Claude, *à relire*). |
| Offres déjà prévues | Sans lien et notification introuvable : **annulées** (rien n'a été envoyé) (choix de l'utilisateur). À la lecture suivante, une offre sans lien, prévue, en erreur ou annulée reçoit le lien et repart ; jamais une offre faite, en essai, refusée ou en cours (une seule offre par personne et par article) (choix de Claude, *à relire*). |
| Données | Un lien de conversation n'est ni un nom ni un pseudo ; effacé avec l'offre au bout de 6 mois ([ADR-0100](0100-donnees-personnelles-minimisation-et-non-indexation.md)). |
| Erreur | Relevé de la page pris automatiquement quand une offre échoue (choix de Claude, *à relire*). |

## Conséquences

- Migration `0029` : colonne `lien` de `offre_favori` (fusion sensible).
- Extension 1.21.3.
