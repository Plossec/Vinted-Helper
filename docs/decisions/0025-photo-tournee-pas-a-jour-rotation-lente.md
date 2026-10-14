# ADR-0025 — Photo tournée pas à jour, rotation lente

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #39
- **Thème** : Photos et sauvegardes

[← Index des décisions](README.md)

## Décision

- Les adresses des images portent un numéro de version (`?c=2`) : les copies gardées une semaine par les navigateurs
  avant #35 sont ignorées ; les images sont ensuite revérifiées à chaque affichage.
- Rotation en un seul décodage (orientation de l'appareil photo + quart de tour), photo et vignette produites en
  parallèle ; sur la fiche, la vignette pivote à l'écran pendant l'enregistrement.
