# ADR-0123 — Offres aux favoris : lecture des notifications et envoi des offres (étape 2)

- **Date** : 22/11/2026
- **Statut** : Accepté · modifié par [ADR-0124](0124-offres-aux-favoris-delai-et-offre-existante.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #149
- **Thème** : Tâches automatisées
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Étape 2 prévue par [ADR-0114](0114-offres-aux-favoris-realisation.md). Relevés de l'utilisateur du 22/11/2026 : menu
des notifications (cloche, « Voir tout »), notifications « pseudo a marqué ton article Titre comme favori Fais-lui une
proposition. », qui ouvrent la conversation avec la fenêtre « Faire une offre » déjà ouverte (champ du prix, bouton
« Faire une offre »). Sur cette page, un cadre anti-robot **caché** faisait croire à une vérification.

## Décision

| Sujet | Décision |
|---|---|
| Lecture | À la fréquence réglée (ou « Lancer maintenant ») : cloche → **« Voir tout »** → notifications de favori lues ; la date du favori est déduite de « il y a 3 jours » (choix de l'utilisateur pour « Voir tout »). |
| Personne | Le pseudo ne quitte jamais le PC : l'extension n'envoie que son **empreinte SHA-256** ; le serveur refuse tout autre format ([ADR-0100](0100-donnees-personnelles-minimisation-et-non-indexation.md)). |
| Article | Retrouvé par le **titre de l'annonce** (sans tenir compte des majuscules) parmi les articles En ligne et Invendu ; titre absent ou porté par plusieurs articles : pas d'offre, raison au journal de l'extension (choix de l'utilisateur). |
| Prix | Règle de baisse des dormants (celle de l'article, sinon celle du compte), arrondie au 0,50 € au-dessus, jamais sous le prix vente minimum (`calculs/baisse.ts`) ; **recalculé** au moment de l'envoi (choix de Claude, *à relire*). |
| Offre | Prévue à la lecture (à valider en mode manuel, dans la même liste que les actions des dormants), confiée à l'extension **après le délai** depuis le favori, une à la fois, dans la plage horaire, après la pause, dans le **plafond du jour** (offres confiées dans la journée) (choix de Claude, *à relire*). Article vendu, retiré ou sans prix d'offre au moment de l'envoi : offre annulée. Republication du dormant prévue : l'offre attend. |
| Envoi | La notification de la personne (empreinte recalculée) ouvre la conversation ; la fenêtre doit porter le titre de l'article ; prix saisi comme au clavier et relu ; **essai** : fenêtre fermée sans rien envoyer ; réel : « Faire une offre » cliqué, la fenêtre doit se fermer (choix de Claude, *à relire*). |
| Ordre des passages | Publication, lecture des ventes, lecture des favoris, actions des dormants, puis offres ; une seule opération par passage (choix de Claude, *à relire*). |
| Premier passage | En **mode essai** (choix de l'utilisateur). |
| Vérification anti-robot | Seule une vérification **visible** met l'extension en pause (relevé du 22/11/2026). |

## Conséquences

- Extension 1.17.0 ; routes `/api/programme/favoris`, `/api/programme/offre-suivante`, `/api/programme/offres/:id/resultat`, `/api/taches/favoris/lancer`.
- Journal des tâches : « Offres aux favoris » ; « Lancer maintenant » sur la carte et dans « À faire ».
- Aucune migration : table `offre_favori` et réglages créés à l'étape 1.
