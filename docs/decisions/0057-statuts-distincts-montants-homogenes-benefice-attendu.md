# ADR-0057 — Statuts distincts, montants homogènes, bénéfice attendu

- **Date** : 13/10/2026
- **Statut** : Accepté · couleurs détaillées par [ADR-0086](0086-couleurs-des-badges-de-statut.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #105
- **Thème** : Interface
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : afficher le **bénéfice attendu** d'un article vendu non finalisé (prix vendu − coût
total, calculé dans `server/src/calculs/benefice.ts`, champ `beneficeAttendu`), sous le bénéfice provisoire du §6.5,
qui reste inchangé (−coût total). Points tranchés par Claude (*à relire*) :
- 9 statuts, 9 apparences : « Envoyé » prend un bleu-vert distinct d'« À expédier » ; « Sortie du stock » est un
  badge en contour, distinct de « Brouillon ». Contrastes ≥ 4,5:1 dans les deux thèmes.
- Montants : vrai signe moins (−) partout (`formatEuros`), négatif en rouge via le composant `Montant` ; les
  positifs ne sont plus en vert (une seule règle partout) ; « + » seulement devant le bénéfice attendu.
- Au passage : la barre de navigation passe au-dessus des colonnes fixes du tableau « Détaillé ».
