# ADR-0130 — Fusion : ce que perd le doublon, articles retournés et offres reçues

- **Date** : 24/11/2026
- **Statut** : Proposé
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #334, #335, #336
- **Thème** : Liste
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

La relecture de code a trouvé trois défauts dans la fusion de deux articles ([ADR-0120](0120-fusion-de-deux-articles.md)) :

- #334 : le doublon mis à la corbeille garde le prix d'achat, le lien Vinted et le statut repris par l'article gardé.
  Restauré, il compte le même coût une seconde fois et paraît vendu sans vente. Pourtant, l'ADR-0120 annonce un
  doublon restaurable « sans ce qui a été repris ».
- #335 : un article vendu puis retourné est encore compté comme vendu.
- #336 : les offres reçues des acheteurs restent sur le doublon, puis la lecture suivante les recrée sur l'article
  gardé : chaque offre apparaît en double.

## Décision

Cet ADR précise l'ADR-0120.

| Sujet | Décision |
|---|---|
| Doublon restaurable | Le doublon reste restaurable 30 jours (ADR-0120), mais **vidé de ce qui a été repris** : sa place dans le lot (déjà le cas), son prix d'achat, son lien Vinted et son lien de conversation quand l'article gardé les a repris. Ses autres champs restent : ils ne comptent ni coût ni vente (choix de Claude, *à relire*). |
| Statut du doublon | Quand l'article gardé prend le statut du doublon, le doublon reçoit en échange l'historique de statut de l'article gardé (ADR-0120). Il garde le statut de cet historique s'il est neutre (Brouillon, En stock) ; sinon, il revient **En stock**, avec une ligne d'historique, et ses informations de sortie du stock sont effacées (choix de Claude, *à relire*). |
| Article retourné | Un article retourné (vente non annulée, article marqué retourné) **n'est plus vendu** pour la fusion, comme partout ailleurs dans l'application (#335). |
| Offres reçues | Les offres reçues du doublon passent sur l'article gardé, sauf une offre Vinted déjà rattachée à l'article gardé ; elles comptent dans l'historique repris de l'aperçu (#336). |
| Signalements « Vu » | Les signalements « Pour info » marqués « Vu » passent sur l'article gardé, sauf ceux d'un type qu'il a déjà (choix de Claude, *à relire*). |

## Conséquences

- `server/src/articles/fusion.ts`, tests dans `server/src/articles/fusion.test.ts` ; aucune migration.
- Les fusions faites avant cette version ne sont pas reprises : un doublon déjà à la corbeille garde ce qu'il avait.
  Le restaurer reste déconseillé pour ces anciennes fusions.
- L'ADR-0120 garde son contenu et passe « modifié par ADR-0130 ».
