# ADR-0037 — Statut « Erreur » de publication

- **Date** : 08/10/2026
- **Statut** : Accepté · précisé par [ADR-0052](0052-statut-erreur-precisions-apres-la-revue-de-code.md)
- **Décideurs** : utilisateur
- **Issue** : #72
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Décision

Décision (utilisateur) : une **vraie** publication en échec (erreur renvoyée par l'extension, publication
interrompue, article devenu incomplet) fait passer l'article **À publier → Erreur** ; en **mode essai**, rien ne
change. Le message de l'échec s'affiche sur la fiche et une alerte « Publications Vinted en erreur » apparaît sur
l'écran Articles. Sortie d'Erreur : « Publier sur Vinted » directement (l'article repasse À publier et entre dans la
file), « Revenir à « À publier » », « Publié à la main : mettre en ligne », Brouillon ou Sortie du stock. Le passage
vers Erreur n'est jamais proposé à la main. Cahier des charges §4.1 et §4.2 complétés ; migration 0009 (nouvelle
valeur `erreur_publication` du statut). Les filtres d'articles mémorisés avec les anciens statuts par défaut
reçoivent automatiquement « Erreur ».
