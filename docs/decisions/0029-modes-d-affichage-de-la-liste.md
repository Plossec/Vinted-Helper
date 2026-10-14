# ADR-0029 — Modes d'affichage de la liste

- **Date** : 07/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #31
- **Thème** : Liste

[← Index des décisions](README.md)

## Décision

- 4 modes au choix de l'utilisateur : Vignettes (actuel, mode par défaut), Liste compacte, Mosaïque, Détaillé
  (tableau). Choix mémorisé sur chaque appareil (choisi par Claude).
- Détaillé : colonnes Article (référence + nom, fixe), Statut, Marque, Catégorie (dernier niveau), Lieu, Achat, Prix
  d'achat, Prix affiché, Bénéfice ; tri par clic sur l'en-tête ; sur téléphone, tableau défilant (choix de
  l'utilisateur). Prix d'achat et bénéfice calculés par le module de calcul et ajoutés à la liste renvoyée par le
  serveur (jamais stockés). Bénéfice provisoire en italique.
- Les colonnes du tableau sont aussi proposées dans « Trier par ».
