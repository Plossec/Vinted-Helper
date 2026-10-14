# ADR-0088 — Gemini : alias « latest » conservé

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : IA Gemini

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q14) : cet alias est celui qui est tombé en panne le 07/10/2026.

## Décision

Le modèle principal conseillé reste l'alias `gemini-flash-latest` (il suit les nouveaux modèles sans
intervention) ; les pannes sont couvertes par le modèle de secours ([ADR-0033](0033-gemini-modele-de-secours.md)).
