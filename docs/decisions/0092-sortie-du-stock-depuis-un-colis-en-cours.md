# ADR-0092 — Sortie du stock depuis un colis en cours

- **Date** : 15/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #192
- **Thème** : Ventes

[← Index des décisions](README.md)

## Contexte

[ADR-0013](0013-lot-3-choix-pris-en-autonomie.md) refusait la sortie du stock d'un article À expédier ou Envoyé,
alors que la mise à la corbeille du même article était permise (l'article sort des calculs, le montant du colis va aux
articles restants). Demande citée : « Autoriser les deux ».

## Décision

| Sujet | Décision |
|---|---|
| Sortie du stock | **Autorisée** depuis À expédier et Envoyé, pour **tous les motifs** (« À vendre hors Vinted » compris). |
| Montant du colis | **Gardé tel quel** (aucun nouveau montant à saisir) et réparti sur les articles restants par le module de calcul, comme pour la corbeille. L'article sort du colis. |
| Dernier article du colis | La **vente est annulée** et sort des calculs, comme un retour du colis entier. |
| Supprimer ce changement | Refusé (l'article ne peut pas revenir dans un colis qu'il a quitté) : « Annuler la sortie du stock » le repasse À publier, puis on refait la vente si besoin. |

## Conséquences

- La fiche de l'article prévient avant de confirmer : « l'article sort du colis… » ou « la vente est annulée ».
- [ADR-0013](0013-lot-3-choix-pris-en-autonomie.md) : ligne « Sortie du stock d'un article dans un colis en cours »
  remplacée par cet ADR.
