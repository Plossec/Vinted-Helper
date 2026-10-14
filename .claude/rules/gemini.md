---
paths:
  - "server/src/ia/**"
---

# Règles de l'IA (Gemini)

Guide : `docs/guides/ia-gemini.md`.

- La clé Gemini reste **côté serveur** (variable d'environnement), jamais dans `client/`, les logs ni les tests ; elle
  est envoyée dans un en-tête, jamais dans l'adresse.
- Les tests **n'appellent jamais réellement Gemini** : client simulé (`creerIASimulee`, `server/src/test/outils.ts`),
  pour préserver le quota gratuit.
- Chaque appel compte dans la limite de 30 par heure et par utilisateur (`LIMITE_IA`, `ia/routes.ts`, #135).
- Gemini indisponible : message clair en français ; « Copier le prompt » doit toujours rester possible.
- Les propositions de l'IA (annonce, étiquette) ne sont enregistrées que si l'utilisateur les valide (sauf l'annonce
  générée, enregistrée et modifiable).
