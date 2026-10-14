# ADR-0005 — Règle d'arrondi : arrondi vers le bas, le reste sur le dernier

- **Date** : 05/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : —
- **Thème** : Calculs

[← Index des décisions](README.md)

## Contexte

Appliquée à la lettre, l'ancienne règle (arrondi au plus proche) pouvait donner une part **négative** au
dernier élément quand le montant est très petit par rapport au nombre d'éléments (ex. 5 centimes sur 8
articles → 1, 1, 1, 1, 1, 1, 1, −2) ou une part très déséquilibrée (65 centimes sur 10 → 7 × 9 puis 2).

## Décision

**Décision (utilisateur)** : dans toute répartition (lot, essence, emballage, vente groupée), chaque part est
**arrondie au centime inférieur** et le **dernier élément reçoit tout le reste**.

**Raison** : l'arrondi au plus proche pouvait donner une part négative au dernier élément (5 centimes sur 8 articles →
1 × 7 puis −2). Avec l'arrondi vers le bas, aucune part n'est jamais négative (5 centimes sur 8 → 0 × 7 puis 5).

**Conséquences**
- Cahier des charges §6 et annexe §11 mis à jour. Trois cas changent :

| Cas | Avant | Après |
|---|---|---|
| 2 — lot de 3 articles pour 5 € | 1,67 / 1,67 / 1,66 | 1,66 / 1,66 / 1,68 |
| 5 — essence 2 € sur 3 articles | 0,67 / 0,67 / 0,66 | 0,66 / 0,66 / 0,68 |
| 12 — emballage 0,08 € sur 3 articles | 0,03 / 0,03 / 0,02 | 0,02 / 0,02 / 0,04 |

- Les cas 1, 3, 4, 6, 8, 9, 10, 11, 23 et 31 sont inchangés (vérifié).
- Tests de l'annexe modifiés **sur décision explicite de l'utilisateur** (seule raison admise de modifier un résultat
  attendu). Ajout de tests garantissant qu'aucune part n'est négative.
