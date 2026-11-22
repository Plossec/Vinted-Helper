# ADR-0111 — Contrôle de types de l'extension

- **Date** : 17/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude ; validé par l'utilisateur le 22/11/2026 (#250)
- **Issue** : #248
- **Thème** : Publication Vinted

[← Index des décisions](README.md)

## Contexte

L'extension (`outils/extension-vinted`) est en JavaScript sans contrôle de types : une faute de nom entre le service
worker, le script de contenu et l'application (champ de l'annonce, type de message, forme du relevé) n'était vue qu'à
l'exécution.

## Décision

Réponses de l'utilisateur (17/11/2026, #248) :

| Sujet | Décision |
|---|---|
| Dépendance | `@types/chrome` en dépendance de développement de l'extension |
| Où | Check « Extension Vinted » (`extension.yml`), seulement quand l'extension change |

Points tranchés par Claude (*à relire*) :
- **Sans changer de langage ni ajouter de construction** : le JavaScript reste chargé tel quel par Chrome ; TypeScript le
  lit (`checkJs`) avec des annotations JSDoc. Commande : `npm run typecheck` dans `outils/extension-vinted`.
- **`typescript`** ajouté aussi aux dépendances de développement de l'extension (même version qu'à la racine) : son
  `package.json` est indépendant et la CI de l'extension n'installe que lui.
- **Types partagés** dans `types/extension.d.ts` : configuration, état stocké, relevé, annonce reçue de l'application,
  messages service worker → script de contenu et pages → service worker.
- **Un contrôle par contexte** (`types/tsconfig.*.json`) : service worker, script de contenu, fenêtre, réglages,
  diagnostic — ce sont des scripts séparés qui déclarent chacun leurs propres noms.
- **Mode non strict** (`strict: false`) : le mode strict demandait plus de 200 retouches du code de remplissage, avec un
  risque de changer son comportement. Le contrôle couvre les noms, les champs des objets typés et les messages ; il
  pourra être durci fichier par fichier.
- **Version de l'extension 1.14.3** : contrôle seul, aucun changement de comportement.

## Conséquences

- Une faute de champ (ex. `articl` au lieu de `article` dans un message d'étape) bloque le check « Extension Vinted ».
- Les types de l'annonce restent recopiés de `server/src/publication/service.ts` ; à relier aux types partagés si #244
  est réalisée.
