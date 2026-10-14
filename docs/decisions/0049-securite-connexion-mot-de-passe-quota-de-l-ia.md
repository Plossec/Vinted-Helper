# ADR-0049 — Sécurité : connexion, mot de passe, quota de l'IA

- **Date** : 13/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #135
- **Thème** : Socle
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** :
- mot de passe : **12 caractères minimum** pour tout nouveau mot de passe (Réglages, réinitialisation, premier
  démarrage) ; le mot de passe actuel reste valable ;
- appels à Gemini (annonce, étiquette) : **30 par heure** et par utilisateur, message « Réessayez dans N min » ;
- connexion : le blocage (5 échecs en 15 minutes) compte par adresse IP **et** par identifiant ; les entrées
  expirées du limiteur sont purgées ;
- documentation : effacer `COMPTE_MOT_DE_PASSE_INITIAL` après le premier démarrage (README), confidentialité des
  photos envoyées à Gemini (offre gratuite, guide IA), `SECURITY.md` (signalement privé GitHub).
Point tranché par Claude (*à relire*) : pas de relecture de sécurité automatique des PR (C7), jugée superflue pour un
projet à un seul utilisateur déjà couvert par CodeQL et l'audit des dépendances.
