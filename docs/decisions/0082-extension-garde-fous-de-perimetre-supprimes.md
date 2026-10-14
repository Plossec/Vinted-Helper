# ADR-0082 — Extension : garde-fous de périmètre supprimés

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q2) : les garde-fous du 06/10 et du 07/10 interdisaient « ni lecture des ventes, ni messages, ni
modification d'annonces », incompatibles avec les tâches #147 à #151.

## Décision

- **Supprimés** (garde-fous de périmètre de [ADR-0020](0020-publication-des-annonces-par-un-programme-sur-le-pc.md) et [ADR-0034](0034-publication-par-une-extension-chrome.md)) : l'extension peut désormais lire les
  ventes, envoyer des offres et des messages, modifier, supprimer et republier des annonces, dans le cadre des
  tâches automatisées ([ADR-0072](0072-taches-automatisees-socle-commun.md)).
- **Conservés** (anti-contournement) : ni camouflage du navigateur, ni résolution de captcha, ni changement
  d'adresse IP ou effacement des cookies ; vérification, captcha, blocage ou déconnexion → **pause**, reprise
  uniquement à la main ; contrôle avant envoi et mode essai.
