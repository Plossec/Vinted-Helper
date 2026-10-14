# ADR-0087 — Serveur OVH : connexion SSH par clé

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197, #127
- **Thème** : Serveur

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q13), modifiée par l'utilisateur en définissant #127 : [ADR-0018](0018-mise-en-ligne-ovh.md) prévoyait une connexion SSH par
mot de passe, protégée par fail2ban.

## Décision

- La connexion SSH d'administration passe **par clé** ; la connexion par mot de passe est désactivée
  (réalisation : issue #127).
- L'**adresse OVH gratuite** est conservée (risque Let's Encrypt et solution de repli inchangés, [ADR-0018](0018-mise-en-ligne-ovh.md)).
