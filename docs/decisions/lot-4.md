# Décisions — Lot 4 — liste et recherche

[← Index des décisions](README.md)

## 06/10/2026 — Lot 4 : choix pris en autonomie *à relire*

| Sujet | Décision |
|---|---|
| Recherche et filtres | Calculés sur le téléphone / PC à partir de la liste complète (quelques centaines d'articles : instantané, fonctionne aussi pour les filtres combinés). Recherche par mots, sans accents ni majuscules. |
| Filtre catégorie | On peut choisir une branche (ex. « Hommes › Vêtements ») : tous les articles de ses sous-catégories sont retenus. |
| Tri par défaut | Date de saisie, la plus récente d'abord (comme avant). |
| Renommer vers un nom existant | Refusé avec le conseil d'utiliser « Fusionner » (évite deux valeurs identiques). |
| Lieu « Maison » | Ne peut pas être fusionné dans un autre lieu (il porte la règle « prix d'achat 0 € »). |
| Corbeille | Purge automatique au démarrage du serveur puis chaque jour. Un article d'un colis peut aller à la corbeille : il sort des calculs et le montant du colis est réparti sur les articles restants. |

---

## 07/10/2026 — Modes d'affichage de la liste (issue #31)

- 4 modes au choix de l'utilisateur : Vignettes (actuel, mode par défaut), Liste compacte, Mosaïque, Détaillé
  (tableau). Choix mémorisé sur chaque appareil (choisi par Claude).
- Détaillé : colonnes Article (référence + nom, fixe), Statut, Marque, Catégorie (dernier niveau), Lieu, Achat, Prix
  d'achat, Prix affiché, Bénéfice ; tri par clic sur l'en-tête ; sur téléphone, tableau défilant (choix de
  l'utilisateur). Prix d'achat et bénéfice calculés par le module de calcul et ajoutés à la liste renvoyée par le
  serveur (jamais stockés). Bénéfice provisoire en italique.
- Les colonnes du tableau sont aussi proposées dans « Trier par ».

---

## 07/10/2026 — Filtres à choix multiples (issue #30)

- Statut, catégorie, marque, lieu et sortie acceptent plusieurs valeurs : un article est retenu s'il correspond à
  l'une des valeurs de chaque filtre ; une catégorie inclut ses sous-catégories ; aucun statut coché = tous.
- Statuts : puces à toucher ; autres filtres : recherche à la frappe, chaque choix devient une puce « × » (choix de
  l'utilisateur).
- Par défaut : tous les statuts sauf Finalisé et Sortie du stock ; « Effacer les filtres » y revient ; filtres gardés
  le temps de la session ; le compteur « Filtres (N) » ne compte pas ce réglage par défaut (choix de l'utilisateur).
- Sélection pour Vinted : proposée quand seul le statut « À publier » est coché.

---

## 07/10/2026 — Lien de l'annonce Vinted saisi à la main (issue #46)

- Champ « Lien de l'annonce Vinted » dans la section Vinted de la fiche ; seules les adresses `https` d'un site Vinted
  (vinted.fr, vinted.be…) sont acceptées ; vide = lien retiré. Simple lien enregistré : l'application n'interroge
  jamais Vinted (règle n° 4).
- Un article Brouillon ou À publier passe **En ligne automatiquement** quand un lien est enregistré, s'il a un prix
  affiché (date du jour) ; sinon le lien est gardé et le prix demandé (choix de l'utilisateur).
- Liste des articles : repère « ↗ » qui ouvre l'annonce, dans tous les modes d'affichage (choix de l'utilisateur).
