# ADR-0119 — Page Réglages en sommaire

- **Date** : 20/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #282
- **Thème** : Interface

[← Index des décisions](README.md)

## Contexte

La page Réglages était une seule longue page (compte, « Menu » de 6 boutons, affichage, calculs, tâches automatiques,
IA, mot de passe, déconnexion). Gênes de l'utilisateur : trop long à faire défiler, on ne trouve pas les choses, ordre
peu logique.

## Décision

| Sujet | Décision |
|---|---|
| Organisation | `/reglages` est un **sommaire** ; chaque rubrique ouvre sa propre page avec « ← Réglages » (choix de l'utilisateur). |
| Ordre | En haut ce qui sert le plus : tâches automatiques, publication Vinted, IA et calculs (choix de l'utilisateur). |
| Groupes | **Automatisation** (Tâches automatiques, Publication Vinted) ; **IA et calculs** (IA, Calculs et alertes) ; **Données** (Frais divers, Sorties, Marques et lieux, Points relais, Corbeille) ; **Application** (Affichage, Compte) (choix de Claude, *à relire*). |
| Rubriques | Une ligne par rubrique : titre et une courte explication de son contenu (choix de Claude, *à relire*). |
| Adresses | `/reglages/taches`, `/reglages/ia`, `/reglages/calculs`, `/reglages/affichage`, `/reglages/compte` ; les autres pages gardent leur adresse (choix de Claude, *à relire*). |
| Version | Affichée en bas du sommaire. |

## Conséquences

- Contenu des réglages inchangé : seule leur place change. Les chemins « Réglages → … » des guides restent justes.
- `client/src/ecrans/Reglages.tsx` (sommaire), `ReglagesRubrique.tsx`, `ReglagesAffichage.tsx`, `ReglagesCompte.tsx`.
- Les points relais allument désormais l'onglet « Réglages » dans la barre du bas.
