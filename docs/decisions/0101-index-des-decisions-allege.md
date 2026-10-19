# ADR-0101 — Index des décisions allégé : par thème, statut en un mot

- **Date** : 19/10/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur (réponses du 19/10/2026)
- **Issue** : #221
- **Thème** : Méthode

[← Index des décisions](README.md)

## Contexte

`docs/decisions/` compte 100 ADR (environ 150 Ko, 1,3 Ko en médiane par fichier). Claude lit rarement les fichiers
eux-mêmes (`docs/regles-en-vigueur.md` donne la règle en vigueur), mais l'index (21 Ko) portait dans sa colonne
« Statut » de longues phrases avec des liens, jusqu'à 350 caractères par ligne. Les fichiers sont cités par 344 liens :
les déplacer ou les fusionner serait risqué. Choix de l'utilisateur : objectif « moins de lecture pour Claude »,
ampleur « alléger l'index seulement ».

## Décision

| Sujet | Décision |
|---|---|
| Statut dans l'index | **Un mot** : Accepté, Modifié, Remplacé, Proposé, Abandonné (+ « à relire »). **Modifié** = accepté, une partie précisée ou remplacée par un ADR plus récent. Le détail (« modifié par ADR-NNNN ») reste dans l'en-tête de chaque fichier. |
| Organisation | Index **groupé par thème** (ordre du modèle), dans l'ordre des numéros à l'intérieur de chaque thème ; la colonne « Thème » disparaît. |
| Fichiers | Aucun fichier déplacé, renommé ni fusionné : liens et historique intacts. |

## Conséquences

- Index ramené de 21 Ko à environ 15 Ko ; une nouvelle décision s'ajoute dans la section de son thème.
- `regles-en-vigueur.md` complété ; version 1.20.1.
