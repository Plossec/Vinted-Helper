# ADR-0010 — Lot 2 : choix pris en autonomie

- **Date** : 06/10/2026
- **Statut** : Accepté · ligne « Sortie » remplacée par [ADR-0011](0011-lieu-de-la-sortie-en-saisie-libre.md)
- **Décideurs** : Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : —
- **Thème** : Saisie terrain

[← Index des décisions](README.md)

## Décision

| Sujet | Décision |
|---|---|
| Dépendance | `sharp` (serveur) : vignettes 400 px des photos (listes légères sur le téléphone) et, au lot 7, réduction à ~1600 px. Fonctionne sous Windows, Linux et dans l'image Docker (versions précompilées, aucun outil à installer). |
| Photo terrain | Facultative (« Achat sans photo ») pour ne jamais bloquer une saisie ; l'original est gardé en pleine qualité (§5.10). |
| Lot | Un achat de N > 1 articles crée un lot : le prix d'achat de chaque article n'est pas stocké, il est calculé (part du prix total). On corrige le **prix total du lot** depuis la fiche. |
| Ordre de répartition | Les articles d'un lot ou d'une sortie sont ordonnés par référence croissante : le « dernier » (qui reçoit le reste) est celui de plus grande référence. |
| Article Maison | Bouton « Article de la maison » sur l'écran Terrain : photo, sans prix, sans sortie, lieu « Maison », 0 €. Plusieurs articles Maison d'un coup = articles séparés (pas de lot). |
| Sortie | Lieu choisi dans la liste existante (pas de création hors ligne, issue #7). Changer la date ou le lieu d'une sortie les reporte sur ses articles. « Terminer la sortie » ne fait qu'oublier la sortie en cours sur le téléphone. |
| File d'attente | Ordre d'envoi = ordre de saisie ; arrêt au premier problème de réseau ; session expirée → tout est gardé jusqu'à la reconnexion ; un élément refusé par le serveur est mis de côté avec son message (Réessayer / Abandonner). |
| Photos d'annonce | Envoyées directement depuis la fiche (réseau nécessaire) : elles se font à la maison. |
| PWA | Service worker écrit à la main (pas de nouvelle dépendance) : l'application est gardée sur le téléphone, l'API n'est jamais mise en cache. Ouverture sur l'écran Terrain. |
