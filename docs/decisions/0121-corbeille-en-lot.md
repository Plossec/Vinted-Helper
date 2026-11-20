# ADR-0121 — Corbeille en lot

- **Date** : 20/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #286
- **Thème** : Liste
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

« J'ai beaucoup d'article en brouillon à supprimer, il faudrait pouvoir sélectionner plusieurs article à supprimer. »
La suppression se faisait une fiche à la fois.

## Décision

| Sujet | Décision |
|---|---|
| Liste des articles | Bouton **« Sélectionner pour supprimer »** (quels que soient les filtres) : cases à cocher, « Tout cocher » (articles affichés), puis **« Mettre à la corbeille (N) »** après confirmation ; corbeille 30 jours comme à l'unité (choix de l'utilisateur). Le mode « Sélectionner pour Vinted » existant garde ses cases, les deux modes ne se mélangent pas (choix de Claude, *à relire*). |
| Garde-fou | Tous les statuts, **sauf les articles vendus** (À expédier, Envoyé, À récupérer, Finalisé) : non cochables dans la liste, et laissés de côté par le serveur avec leur référence (choix de l'utilisateur). |
| Corbeille | Cases à cocher, « Tout cocher », **« Restaurer (N) »** (choix de l'utilisateur). |
| Limite | 500 articles au plus par demande (choix de Claude, *à relire*). |

## Conséquences

- `POST /api/articles/corbeille` et `POST /api/corbeille/restauration` (`{ ids }` → `{ traites, ignores }`).
- La suppression à l'unité depuis la fiche reste possible pour tous les statuts.
