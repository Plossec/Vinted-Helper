# ADR-0084 — Marge moyenne arrondie vers −∞

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #197
- **Thème** : Calculs

[← Index des décisions](README.md)

## Contexte

Relecture de `docs/decisions/` du 14/10/2026 (issue #197) (Q9) : « arrondie au centime inférieur » ([ADR-0015](0015-lot-5-choix-pris-en-autonomie.md)) ne disait pas ce qui se passe pour un
montant négatif.

## Décision

La marge moyenne du tableau de bord est arrondie au centime **inférieur**, y compris pour un montant négatif
(−1,235 € → −1,24 €). C'est déjà le cas (`Math.floor` dans `server/src/calculs/indicateurs.ts`).
