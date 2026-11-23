# ADR-0128 — Skill frontend-design d'Anthropic, encadré par la charte du projet

- **Date** : 23/11/2026
- **Statut** : Accepté
- **Décideurs** : utilisateur, avec des points tranchés par Claude
- **Issue** : #322
- **Thème** : Méthode
- **À relire** : oui

[← Index des décisions](README.md)

## Contexte

L'utilisateur souhaite intégrer le skill [frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
d'Anthropic (licence Apache 2.0) : consignes pour un design soigné, non « générique ». Ce skill pousse à créer une
identité visuelle nouvelle, alors que le projet a sa charte « Techno » ([ADR-0053](0053-refonte-de-l-interface-design-tokens-techno.md)),
ses règles d'interface et d'accessibilité ([ADR-0102](0102-accessibilite-de-l-interface.md)), et interdit toute refonte
non demandée.

## Décision

| Sujet | Décision |
|---|---|
| Intégration | `.claude/skills/frontend-design/` : texte d'Anthropic **en anglais, inchangé**, et `LICENSE.txt` copié tel quel (choix de l'utilisateur). |
| Appel | Par l'utilisateur seulement (`/frontend-design`, `disable-model-invocation`), jamais automatique (choix de Claude, *à relire*, proposé dans l'issue). |
| Préambule | Ajouté en français avant le texte d'origine : la charte « Techno », `.claude/rules/interface.md` et ADR-0102 passent avant ; nouveaux écrans et refontes demandées seulement ; interface en français ; clair et sombre ; téléphone à une main d'abord ; pas de police téléchargée depuis un service externe sans accord (choix de Claude, *à relire*). |
| Démarche | **Plan à valider d'abord** (palette avec jetons existants ou proposés, typographie, maquette texte à 360 px et sur PC, textes) ; aucun code avant la validation (choix de l'utilisateur). |
| Licence | Avis de modification en tête du fichier (Apache 2.0, section 4(b)). |

## Conséquences

- Mise à jour du skill : recopier le texte d'Anthropic sous le préambule, sans toucher au préambule ni à la licence.
