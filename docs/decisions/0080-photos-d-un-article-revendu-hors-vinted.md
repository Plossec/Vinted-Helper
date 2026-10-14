# ADR-0080 — Photos d'un article revendu hors Vinted

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #194
- **Thème** : Photos et sauvegardes

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : un article sorti « À vendre hors Vinted » (#180) garde ses photos en pleine taille ;
dès qu'il change de motif (**Revendu hors Vinted**, ou Donné, Jeté…), ses photos sont réduites comme pour une vente
Vinted finalisée (principale et terrain réduites, autres photos supprimées, irréversible). Comportement déjà en
place depuis #180 (même route que la sortie du stock) : il est désormais couvert par un test
(`server/src/photos/reduction.test.ts`).
