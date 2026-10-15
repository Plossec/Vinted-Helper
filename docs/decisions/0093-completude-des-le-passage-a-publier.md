# ADR-0093 — Complétude contrôlée dès le passage « À publier »

- **Date** : 15/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur
- **Issue** : #196
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Contexte

[ADR-0006](0006-lot-1-decisions-de-cadrage.md) : « À publier » sans contrôle de complétude ; seule la file de
publication refusait un article incomplet, au moment de publier. Demande citée : « Oui, dès À publier ».

## Décision

| Sujet | Décision |
|---|---|
| Contrôle | Tout passage **À publier** (Brouillon, En stock, Erreur, En ligne, À récupérer, annulation d'une sortie du stock) est **refusé si l'article est incomplet**, avec ce qui manque. |
| Liste des champs | **Une seule fonction** (`server/src/metier/completude.ts`) pour le passage À publier et la file de publication : photos d'annonce, prix affiché, titre, description, catégorie, marque, état, couleur. |
| Catégorie « Autre » | **Admise** À publier (« prêt à publier à la main ») ; seule la publication automatique la refuse ([ADR-0065](0065-categories-recopiees-de-vinted.md), #177). |
| File de publication | Son contrôle reste : un article peut devenir incomplet après coup. |
| Articles déjà À publier et incomplets | **Laissés tels quels** et **signalés** dans « À faire » (À traiter, avec ce qui manque, bouton « Compléter »). |
| Sélection pour Vinted | Les articles incomplets restent **visibles, grisés, non cochables**, avec ce qui manque ; « Tout cocher » les ignore. |
| Suppression d'un changement | Revenir à À publier en supprimant le dernier changement (#50) n'est pas contrôlé : c'est une correction ; l'article est alors signalé s'il est incomplet. |

## Conséquences

- Cahier des charges §4.2 : règle ajoutée (accord de l'utilisateur dans l'issue).
- [ADR-0006](0006-lot-1-decisions-de-cadrage.md) : ligne « À publier » remplacée par cet ADR.
