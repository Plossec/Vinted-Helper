# ADR-0033 — Gemini : modèle de secours

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #43
- **Thème** : IA Gemini

[← Index des décisions](README.md)

## Décision

- Constat : `gemini-flash-latest` (alias du dernier modèle) et `gemini-3.5-flash` ne répondaient plus (attente sans
  fin, 503) alors que `gemini-flash-lite-latest` répondait en quelques secondes.
- Modèle de secours (`GEMINI_MODELE_SECOURS`, par défaut `gemini-flash-lite-latest`, « aucun » pour le désactiver) :
  le principal est essayé une fois avec un délai de 30 s ; s'il est saturé, trop lent, sans quota, retiré ou renvoie
  une réponse vide, le secours est essayé (60 s, 2 nouveaux essais sur erreur passagère). Clé refusée : pas de
  secours (même clé).
