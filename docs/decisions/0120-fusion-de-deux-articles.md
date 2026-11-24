# ADR-0120 — Fusion de deux articles

- **Date** : 20/11/2026
- **Statut** : Accepté · modifié par [ADR-0130](0130-fusion-ce-que-perd-le-doublon.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #284
- **Thème** : Liste

[← Index des décisions](README.md)

## Contexte

Un même objet peut exister en double (ex. recréé par « Nouveaux articles par photos » alors qu'il existait déjà).
Jusqu'ici : recopier à la main, télécharger puis réajouter les photos, mettre le doublon à la corbeille.

## Décision

| Sujet | Décision |
|---|---|
| Accès | Fiche du doublon : « Fusionner avec un autre article », sous « Supprimer l'article » ; l'article à garder se cherche par nom ou référence, un aperçu dit ce qui sera repris avant de confirmer (choix de l'utilisateur). |
| Champs | Le doublon ne remplit que les champs **vides** de l'article gardé ; rien n'est écrasé (choix de l'utilisateur). Si le minimum de vente repris dépassait le prix affiché, il n'est pas repris (verrou #195) (choix de Claude, *à relire*). |
| Lot | L'article gardé sans prix d'achat ni lot **prend la place du doublon dans son lot** : la répartition ne change pas pour les autres (choix de l'utilisateur) ; sinon il reprend le prix d'achat du doublon. |
| Statuts | **Tous les statuts** sont admis (choix de l'utilisateur). L'article gardé prend le statut **le plus avancé** des deux, avec son historique de statut, sa vente et ses dates de sortie du stock ; une vente du doublon l'emporte toujours (choix de l'utilisateur). Les deux articles vendus, chacun dans une vente : **refus** (deux objets différents) (choix de Claude, *à relire*). Ordre d'avancement : Brouillon = En stock < À publier = Erreur < En ligne = Invendu < À récupérer < À expédier = Envoyé = Finalisé = Sortie du stock ; à égalité, celui de l'article gardé (choix de Claude, *à relire*). |
| Photos | Celles du doublon sont ajoutées après celles de l'article gardé (sans doublon de photo) (choix de l'utilisateur). |
| Historique | Prix, boosts, ventes, publications Vinted, actions des tâches et offres aux favoris du doublon passent sur l'article gardé (choix de l'utilisateur). Une offre déjà faite à la même personne pour l'article gardé n'est pas reprise (choix de Claude, *à relire*). |
| Doublon | Mis à la **corbeille** (restaurable 30 jours, sans ce qui a été repris) ; il quitte son lot s'il y a cédé sa place. |

## Conséquences

- `server/src/articles/fusion.ts` (une transaction), route `POST /api/articles/:id/fusion` (`essai` = aperçu).
- `client/src/composants/FusionArticle.tsx` sur la fiche article.
- Aucun montant n'est calculé : les valeurs sont déplacées, les parts restent recalculées.
- Une fusion ne se défait pas d'un bouton : restaurer le doublon depuis la corbeille ne lui rend pas ce qui a été repris.
