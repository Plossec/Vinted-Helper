---
paths:
  - "server/src/calculs/**"
---

# Règles du module de calcul

Ce module est le cœur financier de l'application. Une erreur ici fausse tous les bénéfices.
Référence : `docs/cahier-des-charges.md`, §6 (règles) et §11 (cas chiffrés).

## Montants

- **Tout est en centimes entiers** (`number` entier, ou `bigint` si besoin). Jamais de montant à virgule.
- Vérifie avec `Number.isInteger` en entrée des fonctions publiques ; lève une erreur sinon.
- La conversion euros ↔ centimes se fait **hors** de ce module (saisie et affichage).

## Règle d'arrondi (unique)

Une **seule fonction** répartit un total entre N éléments. Toutes les répartitions l'utilisent :
prix d'un lot, essence d'une sortie, emballage d'un colis, prix vendu d'une vente groupée.

- Parts égales : chaque part = `Math.floor(total / N)` (arrondi **vers le bas**) ; la **dernière** part = `total − somme des autres` (tout le reste).
- Au prorata (poids = prix affichés) : chaque part = `Math.floor(total × poids / somme des poids)` ;
  la **dernière** part = `total − somme des autres`.
- La somme des parts est **toujours exactement** égale au total, et **aucune part n'est négative**. Teste-le.
- Ne jamais revenir à `Math.round` : il peut rendre la dernière part négative (5 centimes sur 8 → −2).
- N = 0 : renvoie une liste vide (l'appelant gère le cas, ex. essence d'une sortie vide → frais général).
- Somme des poids = 0 au prorata : bascule en parts égales.
- L'ordre des éléments doit être **stable et déterministe** (ex. tri par identifiant ou ordre de création),
  pour que « le dernier » soit toujours le même.

## Autres règles

- Les parts calculées ne sont **jamais stockées** : ce module reçoit des données et renvoie des résultats.
- Fonctions **pures** : pas d'accès à la base, pas de date « maintenant » implicite (on la passe en paramètre).
- Taux de marge : si la somme des coûts vaut 0, renvoie `null` (affiché « — »), jamais de division par zéro.
- Dates de rattachement des indicateurs : voir §6.6 (CA à la date de **finalisation**, etc.).

## Tests

- **Chaque cas de l'annexe §11 est un test**, nommé avec son numéro (`cas 08 — bénéfice d'un article de lot`).
- Les tests sont écrits **avant** l'implémentation.
- Ne modifie jamais un résultat attendu de l'annexe pour faire passer un test : si un cas semble faux,
  **arrête-toi et pose la question** à l'utilisateur.
