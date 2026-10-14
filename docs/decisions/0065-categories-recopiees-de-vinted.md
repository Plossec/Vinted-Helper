# ADR-0065 — Catégories recopiées de Vinted

- **Date** : 14/10/2026
- **Statut** : Accepté · construction des codes confirmée par [ADR-0085](0085-code-de-categorie-construit-sur-le-chemin.md)
- **Décideurs** : utilisateur
- **Issue** : #177
- **Thème** : Socle

[← Index des décisions](README.md)

## Décision

**Décision (utilisateur)** : l'arbre rédigé de mémoire le 05/10/2026 est remplacé par celui de **vinted.fr**, lu par
Claude le 14/10/2026 (libellés et ordre exacts), **pour les rayons Femmes, Hommes, Sport, Loisirs et collections
seulement** (1 000 catégories choisissables) : « pour le reste on mettra "Autre" ». Une catégorie « Autre » (code
`autre`) couvre Enfants, Maison, Électronique, Livres et médias…

| Sujet | Décision |
|---|---|
| Publication | Un article « Autre » est **refusé** par la file de publication (« à publier à la main sur Vinted »), choix de l'utilisateur. |
| Articles existants | Migration 0015 : chaque ancienne catégorie va vers la plus proche du nouvel arbre (une seule instruction `UPDATE … CASE`, aucune reprise en chaîne) ; anciens rayons Enfants, Maison, Électronique, Animaux, Livres, Musique, Films et « Équipement moto » → « Autre ». Les correspondances approximatives (ex. « Jeans mom » → « Jeans taille haute ») sont listées dans la PR #177. |
| Codes | Toujours construits depuis le chemin ; « ¾ » devient « 3-4 » (« Blouses ¾ » ≠ « Blouses »). Renommer une feuille change son code : migration à prévoir. |
| Mise à jour | Si Vinted change un libellé, l'erreur « catégorie introuvable » de l'extension liste les choix de Vinted ; on corrige alors `categories.ts` (et une migration). |
