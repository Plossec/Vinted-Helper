# Décisions — Lot 3 — ventes et calculs

[← Index des décisions](README.md)

## 06/10/2026 — Lot 3 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Actions dédiées | Les passages qui touchent une vente (Vendu, envoi, finalisation, annulation, retour) ou la sortie du stock ont leur propre formulaire ; le changement simple ne sert qu'entre Brouillon, À publier et En ligne. |
| Vente groupée | Créée depuis la fiche d'un article : on coche les autres articles En ligne du même colis. |
| Retour | « Retour de l'acheteur » depuis Envoyé : on coche les articles renvoyés. Tous cochés = retour du colis entier (vente annulée) ; sinon le nouveau montant crédité est obligatoire. Un litige perdu se saisit comme un retour. |
| Sortie du stock d'un article dans un colis en cours | Refusée (À expédier / Envoyé) : annuler la vente ou enregistrer un retour d'abord, pour ne jamais fausser les montants du colis. |
| Bénéfice des articles À expédier / Envoyé | Provisoire (= − coût total, §6.5) même si le prix vendu est connu ; il devient réel à la finalisation. Le prix vendu est affiché à part. |
| Dates de vente | Vente, envoi et finalisation sont des dates-heures (comme les changements de statut). Corriger l'une d'elles dans l'historique corrige la vente et tout le colis. |
| Article à la corbeille dans un colis | Il ne compte plus : le montant du colis est réparti sur les articles restants (lot 4). |

---

## 07/10/2026 — Lien de la conversation Vinted à la vente (issue #48)

- Champ facultatif « Lien de la conversation Vinted » dans le formulaire « Vendu : à expédier » ; enregistré sur
  chaque article du colis (colonne `article.url_conversation`, migration 0007, ajout de colonne sans perte).
- Modifiable ensuite dans la section Vinted de la fiche (affichée dès qu'un article est vendu) ; icône 💬 dans
  l'alerte « À expédier » (choix de l'utilisateur). Seules les adresses `https` d'un site Vinted sont acceptées ;
  simple lien enregistré, l'application n'interroge jamais Vinted.

## 07/10/2026 — Supprimer le dernier changement de statut (issue #50)

- Seul le **dernier** changement se supprime (bouton sur la dernière ligne de l'historique, confirmation) : l'article
  revient au statut précédent, la ligne d'historique est effacée et les effets liés sont défaits (choix de
  l'utilisateur ; on recommence pour remonter plus loin).
- Colis (choix de l'utilisateur, « mixte ») : « Vendu » → seul l'article sort du colis (vente supprimée s'il était
  seul, sinon nouveau montant crédité demandé pour les autres) ; « Envoyé », « Finalisé », « Annulation par
  l'acheteur » → tout le colis (dates d'envoi / de finalisation effacées, vente réactivée).
- Ne se suppriment pas : la création (corbeille), un retour, l'annulation d'une sortie du stock (motif déjà effacé :
  refaire la sortie). Les photos réduites au passage Finalisé / Sortie du stock ne sont pas restaurées.
