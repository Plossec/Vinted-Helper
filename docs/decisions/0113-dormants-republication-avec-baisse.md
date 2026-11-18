# ADR-0113 — Articles dormants : republication avec baisse

- **Date** : 18/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #147 (cadrage avec #149)
- **Thème** : Tâches automatisées

[← Index des décisions](README.md)

## Contexte

[ADR-0073](0073-tache-articles-dormants.md) prévoyait deux actions : baisser le prix d'un article dormant, puis le
republier une fois au prix minimum (ou directement s'il n'avait pas de minimum ou était réglé « ne pas baisser »).
Lors du cadrage des offres aux favoris (#149, 17/11/2026), l'utilisateur a demandé : « la baisse de prix sera remplacée
par le repostage de l'offre » — « on republie l'annonce avec une baisse de prix ».

## Décision

| Sujet | Décision |
|---|---|
| Action | **Une seule** : la **republication avec baisse** (l'annonce est supprimée puis recréée au prix baissé). La baisse seule disparaît. |
| Baisse | À **chaque** republication, selon la règle de l'article ou du compte (%, montant), arrondie vers le haut au 0,50 €, jamais sous le prix vente minimum (calcul inchangé). |
| Sans baisse possible | Article réglé « ne pas baisser », **sans prix vente minimum**, ou déjà au minimum : **rien n'est fait** ; l'article reste dans les dormants de l'écran « À faire ». |
| Invendu | Après **3 republications** sans vente (inchangé). |
| Priorité | La republication passe avant les offres aux favoris (#149). |
| Anciennes actions | Une baisse seule encore à valider ou en attente est annulée (raison au journal). |

## Conséquences

- Remplace, dans ADR-0073 : « baisse puis republication au minimum » et « sans minimum ou ne pas baisser →
  republication ». ADR-0073 et ADR-0106 : statut « modifié par ADR-0113 ».
- Réglages « pause entre deux baisses » et « baisses par jour » retirés de l'écran (colonnes gardées en base, inutilisées) ;
  seuls la pause et le plafond des republications comptent.
- Extension : inchangée sur le fond (elle recrée déjà l'annonce au prix fourni par l'application) ; journal
  « republication 11,00 € → 10,00 € » (1.14.4).
- Une republication relance le délai dormant (nouveau prix dans l'historique).
