# ADR-0066 — Motif de sortie « À vendre hors Vinted »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #180
- **Thème** : Ventes

[← Index des décisions](README.md)

## Décision

- Nouveau motif de sortie du stock **À vendre hors Vinted** (code `a_vendre`) : l'article est retiré de Vinted pour
  être vendu ailleurs. **Canal obligatoire** (Vide-grenier, Leboncoin, Main propre, Autre), sans prix.
- Choix de l'utilisateur : l'article reste **compté en stock** (valeur du stock, bénéfice provisoire −coût total,
  rien de réalisé, photos gardées) tant qu'il n'est pas vendu.
- Une fois vendu : bouton « Vendu ou autre motif » → **Revendu hors Vinted** (prix + canal) ou un autre motif, sans
  nouveau changement de statut ; la date de sortie devient celle de la revente (CA et trésorerie à cette date).
- **Cahier des charges modifié avec l'accord de l'utilisateur** : §5.7 et glossaire. Annexe §11 inchangée.
- Migration 0013 : nouvelle valeur `a_vendre` du type `motif_sortie` (ajout, sans perte).
