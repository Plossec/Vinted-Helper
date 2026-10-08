# Décisions — Lot 5 — tableau de bord

[← Index des décisions](README.md)

## 06/10/2026 — Lot 5 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Mois | Tous les rattachements au mois se font à l'heure de Paris (une vente finalisée le 31 à 23 h compte dans ce mois). |
| Trésorerie | Achats = prix d'achat des articles (part de lot comprise) à leur date d'achat ; essence de **toutes** les sorties à leur date (les sorties sans article ne sont pas comptées deux fois) ; emballage à la date d'envoi ; crédit à la date de finalisation. |
| Marge moyenne | Arrondie au centime inférieur. Taux = Σ bénéfices / Σ coûts totaux ; « — » si les coûts sont nuls. |
| Délais de vente | En jours calendaires (heure de Paris) entre la dernière mise en ligne avant la vente (ou la date d'achat) et la date de vente. |
| Analyse par catégorie | Regroupée au niveau 3 par défaut (ex. « Hommes › Vêtements › Jeans »), modifiable. Articles sans valeur : « (non renseigné) ». |
| Graphique | Une seule mesure à la fois (une seule échelle), choisie par boutons ; couleur vérifiée (contraste, lisibilité). |
| Rentabilité | Classement par bénéfice provisoire décroissant. Une sortie sans article n'apparaît pas (son essence est en frais généraux). |

## 08/10/2026 — CA et bénéfice théoriques (ventes en cours, #85)

Demande de l'utilisateur : voir aussi les ventes pas encore finalisées. Décisions (utilisateur) : ventes **À
expédier** et **Envoyé** (non renvoyées, vente non annulée) rattachées à la **date de vente** ; affichage par une
ligne « théorique X € · dont en cours Y € » sous les tuiles CA et bénéfice (mois et année) ; frais généraux déduits
du bénéfice théorique. Bénéfice en cours = prix vendu − coût total (le bénéfice provisoire du §6.5, −coût total,
reste inchangé ailleurs). Choix de Claude (*à relire*) : graphique mensuel inchangé (réalisé) ; la ligne n'apparaît
que s'il y a des ventes en cours. Une vente finalisée passe du « en cours » (mois de vente) au réalisé (mois de
finalisation). Cahier des charges §5.9, §6.6 et cas 34-35 de l'annexe §11 ajoutés avec l'accord de l'utilisateur.

## 08/10/2026 — Affichage du tableau de bord revu (#88)

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
