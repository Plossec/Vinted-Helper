# ADR-0028 — Statut « À récupérer » après un retour

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #52
- **Thème** : Ventes

[← Index des décisions](README.md)

## Décision

- Nouveau statut **À récupérer** (après Envoyé) : un retour (colis entier ou partiel) fait passer les articles renvoyés
  À récupérer au lieu d'À publier ; montants inchangés (§6.4).
- Depuis À récupérer : « Récupéré » → **À publier** ou **En ligne** (prix affiché exigé), ou Sortie du stock (choix
  de l'utilisateur). Alerte « À récupérer » sur l'écran Articles (choix de l'utilisateur) ; statut coché par défaut
  dans les filtres ; compté dans le stock.
- **Cahier des charges modifié avec l'accord de l'utilisateur** : §4.1, §4.2, §4.3 et cas **26** et **27** de
  l'annexe §11 (« passe À récupérer » au lieu de « repasse À publier ») ; les deux tests correspondants suivent.
- Migration 0008 : nouvelle valeur `a_recuperer` du type `statut_article` (ajout, sans perte).
