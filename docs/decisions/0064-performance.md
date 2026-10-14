# ADR-0064 — Performance

- **Date** : 14/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : #131
- **Thème** : Tableau de bord

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : fait maintenant, sans attendre l'ouverture au public (#4).
- Calcul : les lignes de vente sont regroupées par vente en un seul passage (au lieu d'un filtre par vente).
- Alertes : un seul appel toutes les 30 secondes au plus, partagé par la barre de navigation et l'écran Articles,
  vidé après toute modification.
- Index ajoutés (migration `0011_index_performance`, ajouts seulement) : `vente`, `boost`, `photo` par utilisateur,
  `frais_general` par utilisateur et date, `publication_vinted` par article, `reglages` par jeton de publication.
- Tableau de bord et Publication Vinted chargés à la demande (gardés sur le téléphone par le service worker) ;
  fichiers `/assets/*` (noms changeant à chaque version) gardés un an par le navigateur.
Points tranchés par Claude (*à relire*) : pas de chargement « au périmètre d'une fiche » ni de fusion des deux
lectures du tableau de bord (Q7) : gain faible à quelques centaines d'articles, risque sur les calculs ; pas de
pagination de la liste (acceptable jusqu'à ~2 000 articles).
