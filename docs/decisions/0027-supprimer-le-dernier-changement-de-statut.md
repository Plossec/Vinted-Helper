# ADR-0027 — Supprimer le dernier changement de statut

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #50
- **Thème** : Ventes

[← Index des décisions](README.md)

## Décision

- Seul le **dernier** changement se supprime (bouton sur la dernière ligne de l'historique, confirmation) : l'article
  revient au statut précédent, la ligne d'historique est effacée et les effets liés sont défaits (choix de
  l'utilisateur ; on recommence pour remonter plus loin).
- Colis (choix de l'utilisateur, « mixte ») : « Vendu » → seul l'article sort du colis (vente supprimée s'il était
  seul, sinon nouveau montant crédité demandé pour les autres) ; « Envoyé », « Finalisé », « Annulation par
  l'acheteur » → tout le colis (dates d'envoi / de finalisation effacées, vente réactivée).
- Ne se suppriment pas : la création (corbeille), un retour, l'annulation d'une sortie du stock (motif déjà effacé :
  refaire la sortie). Les photos réduites au passage Finalisé / Sortie du stock ne sont pas restaurées.
