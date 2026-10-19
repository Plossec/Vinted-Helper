# ADR-0103 — Cache de construction Docker vidé après chaque mise en ligne réussie

- **Date** : 19/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #225
- **Thème** : Serveur

[← Index des décisions](README.md)

## Contexte

Sur le serveur OVH, `docker system df` montrait 22,85 Go de cache de construction inutilisé (399 éléments) :
`scripts/ovh/mettre-a-jour.sh` efface les anciennes images après une mise en ligne
([ADR-0042](0042-verification-apres-deploiement-et-retour-automatique.md)), mais jamais ce cache. Demande de
l'utilisateur : « ajouter une purge de ce cache à la fin d'un déploiement réussi ».

## Décision

| Sujet | Décision |
|---|---|
| Quand | Après une mise en ligne **réussie** (nouvelle version qui répond), juste après l'effacement des anciennes images : `docker builder prune -f`. |
| Refus | Nouvelle version refusée (retour automatique) : rien n'est vidé, le cache peut servir au correctif. |
| Échec du nettoyage | Simple avertissement : la mise à jour n'échoue pas pour autant. |

## Conséquences

- Chaque mise à jour reconstruit l'image sans cache (quelques minutes de plus), une fois le changement en place.
- Le script lancé est celui d'avant `git pull` (ADR-0042) : le premier vidage automatique a lieu au déploiement
  **suivant** la fusion ; d'ici là, vidage à la main (`sudo docker builder prune -f`, guide OVH).
- Vérifié par simulation (faux `docker` et `git`) : réussite, échec du nettoyage, version refusée.
- Hors de cette décision : conservation des sauvegardes `sauvegardes/avant-mise-a-jour/`, jamais purgées.
