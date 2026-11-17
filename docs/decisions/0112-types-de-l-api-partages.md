# ADR-0112 — Types de l'API partagés entre le serveur et l'interface

- **Date** : 17/11/2026
- **Statut** : Accepté · à relire
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #244
- **Thème** : Socle
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

Les types des réponses de l'API étaient recopiés à la main dans `client/src/api.ts` (et dans plusieurs écrans), la
liste des statuts dans `client/src/statuts.ts`, les transitions dans un test du client. Un champ renommé côté serveur
compilait toujours : l'erreur n'apparaissait qu'à l'écran (revue du projet du 13/11/2026).

## Décision

| Sujet | Décision |
|---|---|
| Source unique | `server/src/api/types.ts`, des **types seulement** ; l'interface les importe « en type seulement » : aucun code du serveur dans l'application, `Dockerfile` inchangé (choix de l'utilisateur). |
| Découpage | Une seule PR (choix de l'utilisateur). |
| Contrôle côté serveur | `conforme<Type>()(valeur)` (`server/src/api/conforme.ts`) sur les fonctions et routes qui répondent à l'interface : erreur de compilation qui nomme le champ en cause. Une `Date` est admise là où le contrat attend un texte (elle part en JSON au format ISO) ; des champs en plus sont admis (choix de Claude, *à relire*). |
| Emplacement du contrôle | Sur la fonction quand elle sert plusieurs routes (`lireArticle`, `listerArticles`, `lireVente`), sinon sur la route (choix de Claude, *à relire*). |
| Contrôle à l'exécution | Aucun (pas de nouvelle dépendance, proposition de l'issue). |
| Constantes | Les libellés (statuts, motifs, canaux) restent dans l'interface ; le test des étapes conseillées lit les transitions dans le serveur au lieu d'une copie (choix de Claude, *à relire*). |

## Conséquences

- Changer un type de réponse : modifier `server/src/api/types.ts` ; le serveur et l'interface sont vérifiés ensemble
  par `npm run typecheck`.
- Écarts trouvés à la mise en place : `couts` d'une fiche pouvait être `null` en théorie (cas impossible, désormais une
  erreur du serveur) ; date de sortie du stock vide autorisée par la base (affichée « 01/01/1970 », désormais omise) ;
  corbeille : date de suppression jamais vide, rendu explicite.
- Limite : une `Date` est admise pour tout champ texte du contrat ; un texte mis à la place d'une date n'est pas vu.
