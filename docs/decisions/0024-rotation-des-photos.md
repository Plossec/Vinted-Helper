# ADR-0024 — Rotation des photos

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #35
- **Thème** : Photos et sauvegardes

[← Index des décisions](README.md)

## Décision

- Boutons ↺ ↻ sous chaque photo de la fiche (terrain et annonce) : quart de tour, **définitif** (choix de
  l'utilisateur). Le fichier est réécrit en JPEG sur le serveur (orientation de l'appareil photo appliquée avant) et sa
  vignette recréée ; une photo terrain de lot tourne pour tous les articles du lot.
- Les images ne sont plus gardées une semaine sans vérification : le navigateur les revérifie (empreinte `ETag`,
  réponse 304 si inchangée), pour afficher partout la photo tournée.
