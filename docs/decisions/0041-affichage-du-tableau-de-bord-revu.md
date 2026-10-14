# ADR-0041 — Affichage du tableau de bord revu

- **Date** : 08/10/2026
- **Statut** : Accepté · graphique et tuiles précisés par [ADR-0050](0050-graphique-et-api-du-tableau-de-bord-apres-la-revue-de-code.md) et [ADR-0051](0051-tuiles-ca-et-benefice-montant-affiche-une-seule-fois.md)
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #88
- **Thème** : Tableau de bord
- **À relire** : oui (points tranchés par Claude, marqués « *à relire* » ou « choix de Claude »)

[← Index des décisions](README.md)

## Décision

Constat : « octobre · année 392 € » était lu comme un chiffre d'octobre (c'était le total de l'année) ; les calculs
ne changent pas. Décisions (utilisateur) :
- années proposées : seulement les années d'activité (de la première donnée datée à l'année en cours) ;
- tuiles CA et bénéfice : gros chiffre = mois réalisé, lignes « *Mois Année* réalisé » et « *Mois Année* théorique » ;
  plus de total d'année ni de « dont en cours » dans les tuiles (comparatif annuel : évolution possible plus tard) ;
- trésorerie : chiffre du mois + son calcul (postes) ; frais généraux : info-bulle ⓘ et bouton « Ajouter des frais
  divers » ;
- graphique : barres empilées réalisé + théorique pour les trois mesures ; trésorerie : complément = crédits Vinted
  attendus des ventes en cours ; « Voir le tableau » en bouton ;
- stock par statut : colonnes coût total et prix affiché avant la quantité.
Choix de Claude (*à relire*) : sur téléphone, les tuiles du haut prennent toute la largeur ; complément de bénéfice
dessiné seulement s'il est positif (la bulle et le tableau donnent toujours le théorique).
