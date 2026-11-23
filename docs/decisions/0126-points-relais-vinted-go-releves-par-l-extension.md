# ADR-0126 — Points relais Vinted Go : relevés par l'extension

- **Date** : 23/11/2026
- **Statut** : Proposé
- **Décideurs** : Claude (PR #308, corrigée à la demande de l'utilisateur)
- **Issue** : #262
- **Thème** : Ventes
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

[ADR-0109](0109-points-relais-saisis-et-relies-aux-ventes.md) : points relais saisis à la main, statut lu par
l'extension « à venir, une issue par transporteur ». #262 traite Vinted Go, dont la page publique des points
(vintedgo.com) montre horaires, état (pas de compartiments, ramassage uniquement, hors service) et capacité.

## Décision

| Sujet | Décision |
|---|---|
| Lecture | L'extension ouvre la page des points Vinted Go, sélectionne le point (nom ou adresse), puis lit horaires (toutes les plages de chaque jour), état et capacité par taille (XS, S, M) (*à relire*). |
| Rythme | Un point est relu **une fois par 24 h**, ou tout de suite après « Relever maintenant » sur sa fiche ; seulement quand aucune annonce n'attend d'être publiée ; un relevé à la fois (*à relire*). |
| Échec | La raison est gardée sur le point et affichée sur sa fiche ; le relevé compte comme fait (pas de nouvel essai avant 24 h ou une nouvelle demande) ; rien d'autre n'est arrêté (*à relire*). |
| Horaires | Pour un point Vinted Go, ils viennent seulement du relevé : ceux du formulaire sont ignorés, et gardés tels quels quand on modifie le nom ou les notes (*à relire*). |
| Ouvert / fermé | Fermé si Vinted Go l'indique (pas de compartiments, ramassage uniquement, hors service, fermé), sinon d'après les horaires relevés (*à relire*). |
| Repères | Dans `selecteurs.js` ; seul le début des noms de classes du site est cherché (la fin change à chaque mise à jour de Vinted Go) (*à relire*). |
| Données | Numéro du point Vinted Go, état, capacité, date et erreur du dernier relevé ; aucune donnée personnelle. |

## Conséquences

- Migrations `0026` (relevé) et `0027` (erreur du relevé) : fusion sensible, accord de l'utilisateur avant la fusion.
- Extension 1.20.0 ; route de l'extension `POST /api/programme/points-relais/:id/releve-vinted-go`.
- Les autres transporteurs restent saisis à la main.
