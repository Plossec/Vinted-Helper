# ADR-0032 — Gemini : modèle retiré et serveurs surchargés

- **Date** : 07/10/2026
- **Statut** : Accepté · complété par [ADR-0033](0033-gemini-modele-de-secours.md) et [ADR-0088](0088-gemini-alias-latest-conserve.md)
- **Décideurs** : utilisateur
- **Issue** : #38
- **Thème** : IA Gemini

[← Index des décisions](README.md)

## Décision

- `gemini-2.5-flash` n'est plus proposé par Google (404). Modèle conseillé partout (installation, `.env.example`,
  guides, message d'erreur) : l'alias **`gemini-flash-latest`**, qui suit le dernier modèle « Flash ».
- Erreurs passagères de Google (500, 502, 503, 504) : **2 nouveaux essais** automatiques, après 2 s puis 5 s, avant
  le message « Gemini est surchargé pour le moment… ».
