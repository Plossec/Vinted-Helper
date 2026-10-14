# ADR-0067 — Statut « En stock »

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #183
- **Thème** : Ventes

[← Index des décisions](README.md)

## Décision

- Nouveau statut **En stock** (`en_stock`) : article gardé hors vente (boîte de lunettes vide…).
- Choix de l'utilisateur : passages **comme un Brouillon** (depuis Brouillon ou À publier ; vers Brouillon, À publier
  ou Sortie du stock) ; compté dans la **valeur du stock** et le bénéfice provisoire (−coût total) ; **aucune alerte** ;
  **décoché par défaut** dans les filtres de la liste ; choisi depuis la fiche seulement (saisie terrain inchangée).
- **Cahier des charges modifié avec l'accord de l'utilisateur** : §4.1 et §4.2 ; le test des transitions (§4.2)
  suit. Annexe §11 inchangée.
- Migration 0014 : nouvelle valeur `en_stock` du type `statut_article` (ajout, sans perte).
