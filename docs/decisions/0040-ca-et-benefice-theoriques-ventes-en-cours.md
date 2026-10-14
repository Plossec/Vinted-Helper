# ADR-0040 — CA et bénéfice théoriques (ventes en cours)

- **Date** : 08/10/2026
- **Statut** : Accepté · affichage remplacé par [ADR-0041](0041-affichage-du-tableau-de-bord-revu.md) ; terme « bénéfice en cours » : voir l'issue #193
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 14/10/2026 (#203)
- **Issue** : #85
- **Thème** : Tableau de bord

[← Index des décisions](README.md)

## Décision

Demande de l'utilisateur : voir aussi les ventes pas encore finalisées. Décisions (utilisateur) : ventes **À
expédier** et **Envoyé** (non renvoyées, vente non annulée) rattachées à la **date de vente** ; affichage par une
ligne « théorique X € · dont en cours Y € » sous les tuiles CA et bénéfice (mois et année) ; frais généraux déduits
du bénéfice théorique. Bénéfice en cours = prix vendu − coût total (le bénéfice provisoire du §6.5, −coût total,
reste inchangé ailleurs). Choix de Claude (*à relire*) : graphique mensuel inchangé (réalisé) ; la ligne n'apparaît
que s'il y a des ventes en cours. Une vente finalisée passe du « en cours » (mois de vente) au réalisé (mois de
finalisation). Cahier des charges §5.9, §6.6 et cas 34-35 de l'annexe §11 ajoutés avec l'accord de l'utilisateur.
